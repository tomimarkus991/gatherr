package com.gatherr.backend.service;

import com.gatherr.backend.dto.ConfirmEventDto;
import com.gatherr.backend.dto.CreateEventDto;
import com.gatherr.backend.dto.EventResponseDto;
import com.gatherr.backend.dto.StartTimeRoundDto;
import com.gatherr.backend.dto.UpdateEventDto;
import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.EventUser;
import com.gatherr.backend.model.User;
import com.gatherr.backend.model.enums.EventRound;
import com.gatherr.backend.model.enums.EventType;
import com.gatherr.backend.repository.EventRepository;
import com.gatherr.backend.repository.EventUserRepository;
import com.gatherr.backend.repository.UserRepository;
import com.gatherr.backend.util.ConfirmedSlot;
import com.gatherr.backend.util.SlotTimes;
import com.gatherr.backend.util.WordConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class EventService {

    private static final Set<Integer> TIME_INCREMENTS = Set.of(15, 30, 60);
    private static final DateTimeFormatter DATE_SLOT = DateTimeFormatter.ofPattern("ddMMuuuu")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter TIME_SLOT = DateTimeFormatter.ofPattern("HHmm");

    private final EventRepository eventRepository;
    private final EventUserRepository eventUserRepository;
    private final UserRepository userRepository;
    private final ConfirmationMailService confirmationMailService;
    private final TimeRoundMailService timeRoundMailService;
    private final Clock clock;

    @Transactional
    public EventResponseDto createEvent(Long creatorId, CreateEventDto dto) {

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + creatorId));

        Event event = Event.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .type(dto.getType())
                .times(dto.getTimes())
                .timezone(dto.getTimezone())
                .shortId(generateUniqueShortId())
                .timeIncrement(dto.getTimeIncrement())
                .creator(creator)
                .build();
        
        Event savedEvent = eventRepository.save(event);

        EventUser eventUser = new EventUser();
        eventUser.setEvent(savedEvent);
        eventUser.setUser(creator);
        eventUser.setAvailable(new ArrayList<>());
        eventUser.setNotAvailable(new ArrayList<>());

        eventUserRepository.save(eventUser);

        return EventResponseDto.from(savedEvent);
    }

    private String generateUniqueShortId() {
        String shortId;
        do {
            shortId = generateSlug();
        } while (eventRepository.existsByShortId(shortId));
        return shortId;
    }

    private String generateSlug() {
        List<String> words = WordConstants.ID_WORDS;

        String first = words.get(ThreadLocalRandom.current().nextInt(words.size()));
        String second = words.get(ThreadLocalRandom.current().nextInt(words.size()));
        String third = words.get(ThreadLocalRandom.current().nextInt(words.size()));
        int number = ThreadLocalRandom.current().nextInt(100000, 1000000);

        return first + "-" + second + "-" + third + "-" + number;
    }

    public List<EventResponseDto> getMyEvents(Long userId) {
        return eventUserRepository.findByUserIdAndEvent_IsDeletedFalse(userId)
            .stream()
            .map(eventUser -> EventResponseDto.from(eventUser.getEvent()))
            .toList();
    }

    @Transactional(readOnly = true)
    public EventResponseDto getEventByShortId(String shortId) {
        Event event = eventRepository.findByShortIdAndIsDeletedFalse(shortId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Event not found: " + shortId
                ));
        return EventResponseDto.from(event);
    }

    public EventResponseDto updateEvent(Long userId, String shortId, UpdateEventDto updateEventDto) {
        Event event = findActiveEventByShortId(shortId);
        validateCreator(event, userId);
        applyUpdates(event, updateEventDto);
        Event savedEvent = eventRepository.save(event);
        return EventResponseDto.from(savedEvent);
    }

    private void applyUpdates(Event event, UpdateEventDto dto) {
        if (dto.name() != null) {
            event.setName(dto.name());
        }

        if (dto.description() != null) {
            event.setDescription(dto.description());
        }
    }

    private void validateCreator(Event event, Long userId) {
        if (!event.getCreator().getId().equals(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You are not allowed to update this event"
            );
        }
    }

    private Event findActiveEventByShortId(String shortId) {
        return eventRepository.findByShortIdAndIsDeletedFalse(shortId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Event not found"
                ));
    }

    @Transactional
    public void deleteEvent(Long userId, String shortId) {
        Event event = eventRepository.findByShortIdAndIsDeletedFalse(shortId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Event not found: " + shortId
                ));

        if (!event.getCreator().getId().equals(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Forbidden"
            );
        }
        event.setDeleted(true);
        eventRepository.save(event);
    }

    @Transactional
    public EventResponseDto confirmEvent(Long userId, String shortId, ConfirmEventDto dto) {
        Event event = findActiveEventByShortId(shortId);
        if (!event.getCreator().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the organiser can confirm a time");
        }
        if (event.getTimes() == null || !event.getTimes().contains(dto.slot())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot is not one of the event's times");
        }

        ConfirmedSlot slot = SlotTimes.resolve(event.getType(), dto.slot(), ZoneId.of(event.getTimezone()),
                event.getTimeIncrement(), clock);
        Instant now = clock.instant();
        event.setConfirmedAt(now.atOffset(ZoneOffset.UTC));
        event.setConfirmedStart(slot.start().toOffsetDateTime());
        event.setConfirmedEnd(slot.end().toOffsetDateTime());
        Event savedEvent = eventRepository.save(event);

        List<User> participants = eventUserRepository.findByEventShortId(shortId).stream()
                .map(EventUser::getUser)
                .toList();
        confirmationMailService.sendConfirmation(savedEvent, slot, participants, now);

        return EventResponseDto.from(savedEvent);
    }

    /**
     * Moves a dates-only event from its date round to a time round on one of its dates (issue #94).
     * The event's times become that date's slots; each participant's date answers are kept
     * read-only and their time answers start empty. Everyone who answered, except the organiser,
     * gets an email. There is no way back to the date round.
     */
    @Transactional
    public EventResponseDto startTimeRound(Long userId, String shortId, StartTimeRoundDto dto) {
        Event event = findActiveEventByShortId(shortId);
        if (!event.getCreator().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the organiser can start the time round");
        }
        if (event.getRound() != EventRound.DATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The event is not in the date round");
        }
        if (event.getTimes() == null || !event.getTimes().contains(dto.date())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date is not one of the event's dates");
        }
        if (!TIME_INCREMENTS.contains(dto.timeIncrement())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Time increment must be 15, 30 or 60 minutes");
        }
        LocalDate date;
        LocalTime start;
        LocalTime end;
        try {
            date = LocalDate.parse(dto.date(), DATE_SLOT);
            start = LocalTime.parse(dto.startTime());
            end = LocalTime.parse(dto.endTime());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date or time");
        }
        if (!start.isBefore(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }

        event.setDateTimes(new ArrayList<>(event.getTimes()));
        event.setTimes(timeSlots(dto.date(), start, end, dto.timeIncrement()));
        event.setType(EventType.SPECIFIC_DATES_AND_TIMES);
        event.setTimeIncrement(dto.timeIncrement());
        event.setTimeRoundDate(date);
        Event savedEvent = eventRepository.save(event);

        List<EventUser> answers = eventUserRepository.findByEventShortId(shortId);
        for (EventUser answer : answers) {
            answer.setDateAvailable(answer.getAvailable());
            answer.setDateNotAvailable(answer.getNotAvailable());
            answer.setAvailable(new ArrayList<>());
            answer.setNotAvailable(new ArrayList<>());
        }
        eventUserRepository.saveAll(answers);

        List<User> recipients = answers.stream()
                .map(EventUser::getUser)
                .filter(user -> !user.getId().equals(userId))
                .toList();
        timeRoundMailService.sendTimeRoundStarted(savedEvent, date, recipients);

        return EventResponseDto.from(savedEvent);
    }

    /** {@code HHmm-ddMMyyyy} slots from start to end, both included, like the create page makes them. */
    private static List<String> timeSlots(String dateSlot, LocalTime start, LocalTime end, int incrementMinutes) {
        List<String> slots = new ArrayList<>();
        for (LocalTime time = start; !time.isAfter(end); time = time.plusMinutes(incrementMinutes)) {
            slots.add(TIME_SLOT.format(time) + "-" + dateSlot);
            if (time.plusMinutes(incrementMinutes).isBefore(time)) {
                break; // wrapped past midnight
            }
        }
        return slots;
    }
}
