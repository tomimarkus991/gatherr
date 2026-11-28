package com.gatherr.backend.service;

import com.gatherr.backend.dto.ConfirmEventDto;
import com.gatherr.backend.dto.CreateEventDto;
import com.gatherr.backend.dto.EventResponseDto;
import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.EventUser;
import com.gatherr.backend.model.RangeDetail;
import com.gatherr.backend.model.User;
import com.gatherr.backend.model.enums.EventType;
import com.gatherr.backend.repository.EventRepository;
import com.gatherr.backend.repository.EventUserRepository;
import com.gatherr.backend.repository.UserRepository;
import com.gatherr.backend.util.ConfirmedSlot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Trip events (issue #148): create validation and confirming a date range. */
@ExtendWith(MockitoExtension.class)
class EventServiceTripTest {

    private static final String SHORT_ID = "sunny-rome-trip-123456";
    private static final Instant NOW = Instant.parse("2026-11-27T12:00:00Z");
    private static final ZoneId TALLINN = ZoneId.of("Europe/Tallinn");

    @Mock
    private EventRepository eventRepository;
    @Mock
    private EventUserRepository eventUserRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ConfirmationMailService confirmationMailService;

    private EventService eventService;
    private User organiser;

    @BeforeEach
    void setUp() {
        eventService = new EventService(eventRepository, eventUserRepository, userRepository,
                confirmationMailService, null, Clock.fixed(NOW, ZoneOffset.UTC));
        organiser = User.builder().id(1L).name("Olivia Organiser").email("olivia@example.com").build();
    }

    private static CreateEventDto trip(List<String> times, Map<String, RangeDetail> details) {
        CreateEventDto dto = new CreateEventDto();
        dto.setName("Rome");
        dto.setType(EventType.DATE_RANGES);
        dto.setTimes(times);
        dto.setTimezone("Europe/Tallinn");
        dto.setTimeIncrement(30);
        dto.setRangeDetails(details);
        return dto;
    }

    @Test
    void createTrip_storesRangesAndDetails() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(organiser));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));

        EventResponseDto response = eventService.createEvent(1L, trip(
                List.of("01122026-03122026", "14122026-18122026", "23122026-23122026"),
                Map.of("01122026-03122026", new RangeDetail("Rome, Ryanair €89", "https://example.com/rome"))));

        assertThat(response.type()).isEqualTo(EventType.DATE_RANGES);
        assertThat(response.times()).containsExactly("01122026-03122026", "14122026-18122026", "23122026-23122026");
        assertThat(response.rangeDetails()).containsExactly(Map.entry("01122026-03122026",
                new RangeDetail("Rome, Ryanair €89", "https://example.com/rome")));
    }

    @Test
    void createTrip_withBadRangeOrLink_is400_andNothingIsSaved() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(organiser));

        assertThatThrownBy(() -> eventService.createEvent(1L, trip(List.of("03122026-01122026"), null)))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
        assertThatThrownBy(() -> eventService.createEvent(1L, trip(List.of("01122026"), null)))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
        assertThatThrownBy(() -> eventService.createEvent(1L, trip(List.of("01122026-03122026"),
                Map.of("01122026-03122026", new RangeDetail(null, "javascript:alert(1)")))))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");

        verify(eventRepository, never()).save(any());
    }

    @Test
    void rangeDetailsOnAnotherType_is400() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(organiser));
        CreateEventDto dto = trip(List.of("01122026"), Map.of("01122026", new RangeDetail("x", null)));
        dto.setType(EventType.SPECIFIC_DATES);

        assertThatThrownBy(() -> eventService.createEvent(1L, dto))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
        verify(eventRepository, never()).save(any());
    }

    @Test
    void confirmRange_storesAllDayWindow_fromStartDayToTheDayAfterTheEndDay() {
        Event event = Event.builder()
                .id(10L)
                .name("Rome")
                .shortId(SHORT_ID)
                .creator(organiser)
                .type(EventType.DATE_RANGES)
                .times(List.of("01122026-03122026", "14122026-18122026"))
                .timeIncrement(30)
                .timezone("Europe/Tallinn")
                .eventUsers(new ArrayList<>())
                .build();
        when(eventRepository.findByShortIdAndIsDeletedFalse(SHORT_ID)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));
        when(eventUserRepository.findByEventShortId(SHORT_ID)).thenReturn(List.of(
                EventUser.builder().event(event).user(organiser).available(List.of()).notAvailable(List.of()).build()));

        EventResponseDto response = eventService.confirmEvent(1L, SHORT_ID, new ConfirmEventDto("14122026-18122026"));

        OffsetDateTime start = ZonedDateTime.of(2026, 12, 14, 0, 0, 0, 0, TALLINN).toOffsetDateTime();
        OffsetDateTime end = ZonedDateTime.of(2026, 12, 19, 0, 0, 0, 0, TALLINN).toOffsetDateTime();
        assertThat(response.confirmedStart()).isEqualTo(start);
        assertThat(response.confirmedEnd()).isEqualTo(end);

        ArgumentCaptor<ConfirmedSlot> slot = ArgumentCaptor.forClass(ConfirmedSlot.class);
        verify(confirmationMailService).sendConfirmation(eq(event), slot.capture(), eq(List.of(organiser)), eq(NOW));
        assertThat(slot.getValue().allDay()).isTrue();
        assertThat(slot.getValue().start().toOffsetDateTime()).isEqualTo(start);
        assertThat(slot.getValue().end().toOffsetDateTime()).isEqualTo(end);
    }
}
