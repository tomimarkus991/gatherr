package com.gatherr.backend.service;

import com.gatherr.backend.dto.EventResponseDto;
import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.EventUser;
import com.gatherr.backend.model.User;
import com.gatherr.backend.model.enums.EventType;
import com.gatherr.backend.repository.EventRepository;
import com.gatherr.backend.repository.EventUserRepository;
import com.gatherr.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventServiceMyEventsTest {

    @Mock
    private EventRepository eventRepository;
    @Mock
    private EventUserRepository eventUserRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ConfirmationMailService confirmationMailService;

    private final User me = User.builder().id(1L).name("Me").email("me@example.com").build();

    private EventUser membership(long id, String createdAt) {
        Event event = Event.builder()
                .id(id)
                .name("Event " + id)
                .shortId("event-" + id)
                .creator(me)
                .type(EventType.SPECIFIC_DATES_AND_TIMES)
                .times(List.of())
                .timezone("Europe/Tallinn")
                .eventUsers(new ArrayList<>())
                .createdAt(OffsetDateTime.parse(createdAt))
                .build();
        return EventUser.builder().event(event).user(me).available(List.of()).notAvailable(List.of()).build();
    }

    @Test
    void myEvents_carryCreatedAt_newestFirst() {
        EventService eventService = new EventService(eventRepository, eventUserRepository, userRepository,
                confirmationMailService, null, Clock.system(ZoneOffset.UTC));
        when(eventUserRepository.findByUserIdAndEvent_IsDeletedFalse(1L)).thenReturn(List.of(
                membership(1, "2026-10-01T10:00:00Z"),
                membership(2, "2026-11-20T10:00:00Z"),
                membership(3, "2026-11-01T10:00:00Z")));

        List<EventResponseDto> events = eventService.getMyEvents(1L);

        assertThat(events).extracting(EventResponseDto::id).containsExactly(2L, 3L, 1L);
        assertThat(events.get(0).createdAt()).isEqualTo(OffsetDateTime.parse("2026-11-20T10:00:00Z"));
    }
}
