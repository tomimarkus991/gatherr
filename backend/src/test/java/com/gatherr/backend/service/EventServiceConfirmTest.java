package com.gatherr.backend.service;

import com.gatherr.backend.dto.ConfirmEventDto;
import com.gatherr.backend.dto.EventResponseDto;
import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.EventUser;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventServiceConfirmTest {

    private static final String SHORT_ID = "happy-blue-fox-123456";
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
    private User participant;
    private Event event;

    @BeforeEach
    void setUp() {
        eventService = new EventService(eventRepository, eventUserRepository, userRepository,
                confirmationMailService, null, Clock.fixed(NOW, ZoneOffset.UTC));

        organiser = User.builder().id(1L).name("Olivia Organiser").email("olivia@example.com").build();
        participant = User.builder().id(2L).name("Pat Participant").email("pat@example.com").build();
        event = Event.builder()
                .id(10L)
                .name("Team lunch")
                .shortId(SHORT_ID)
                .creator(organiser)
                .type(EventType.SPECIFIC_DATES_AND_TIMES)
                .times(List.of("0900-31032026", "0930-31032026"))
                .timeIncrement(30)
                .timezone("Europe/Tallinn")
                .eventUsers(new ArrayList<>())
                .build();
    }

    private EventUser row(User user) {
        return EventUser.builder().event(event).user(user).available(List.of()).notAvailable(List.of()).build();
    }

    @Test
    void organiserConfirms_storesConfirmation_andEmailsEveryParticipant() {
        when(eventRepository.findByShortIdAndIsDeletedFalse(SHORT_ID)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));
        when(eventUserRepository.findByEventShortId(SHORT_ID)).thenReturn(List.of(row(organiser), row(participant)));

        EventResponseDto response = eventService.confirmEvent(1L, SHORT_ID, new ConfirmEventDto("0900-31032026"));

        OffsetDateTime expectedStart = ZonedDateTime.of(2026, 3, 31, 9, 0, 0, 0, TALLINN).toOffsetDateTime();
        OffsetDateTime expectedEnd = ZonedDateTime.of(2026, 3, 31, 9, 30, 0, 0, TALLINN).toOffsetDateTime();

        ArgumentCaptor<Event> saved = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository).save(saved.capture());
        assertThat(saved.getValue().getConfirmedStart()).isEqualTo(expectedStart);
        assertThat(saved.getValue().getConfirmedEnd()).isEqualTo(expectedEnd);
        assertThat(saved.getValue().getConfirmedAt()).isEqualTo(NOW.atOffset(ZoneOffset.UTC));

        assertThat(response.confirmedStart()).isEqualTo(expectedStart);
        assertThat(response.confirmedEnd()).isEqualTo(expectedEnd);
        assertThat(response.confirmedAt()).isEqualTo(NOW.atOffset(ZoneOffset.UTC));

        ArgumentCaptor<ConfirmedSlot> slot = ArgumentCaptor.forClass(ConfirmedSlot.class);
        verify(confirmationMailService).sendConfirmation(eq(event), slot.capture(), eq(List.of(organiser, participant)), eq(NOW));
        assertThat(slot.getValue().allDay()).isFalse();
        assertThat(slot.getValue().start().toOffsetDateTime()).isEqualTo(expectedStart);
    }

    @Test
    void nonOrganiser_gets403_andNothingIsStoredOrSent() {
        when(eventRepository.findByShortIdAndIsDeletedFalse(SHORT_ID)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> eventService.confirmEvent(2L, SHORT_ID, new ConfirmEventDto("0900-31032026")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");

        verify(eventRepository, never()).save(any());
        verifyNoInteractions(confirmationMailService);
    }

    @Test
    void unknownSlot_gets400_andNothingIsStoredOrSent() {
        when(eventRepository.findByShortIdAndIsDeletedFalse(SHORT_ID)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> eventService.confirmEvent(1L, SHORT_ID, new ConfirmEventDto("1000-31032026")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");

        verify(eventRepository, never()).save(any());
        verifyNoInteractions(confirmationMailService);
    }

    @Test
    void missingOrDeletedEvent_gets404() {
        when(eventRepository.findByShortIdAndIsDeletedFalse(SHORT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.confirmEvent(1L, SHORT_ID, new ConfirmEventDto("0900-31032026")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");

        verifyNoInteractions(confirmationMailService);
    }

    @Test
    void confirmationIsSavedBeforeMailIsSent() {
        when(eventRepository.findByShortIdAndIsDeletedFalse(SHORT_ID)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));
        when(eventUserRepository.findByEventShortId(SHORT_ID)).thenReturn(List.of(row(participant)));

        eventService.confirmEvent(1L, SHORT_ID, new ConfirmEventDto("0930-31032026"));

        var inOrder = inOrder(eventRepository, confirmationMailService);
        inOrder.verify(eventRepository).save(any(Event.class));
        inOrder.verify(confirmationMailService).sendConfirmation(any(), any(), anyList(), any());
    }
}
