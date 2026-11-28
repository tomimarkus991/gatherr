package com.gatherr.backend.service;

import com.gatherr.backend.dto.EventSummaryDto;
import com.gatherr.backend.dto.RespondDto;
import com.gatherr.backend.dto.SlotSummaryDto;
import com.gatherr.backend.dto.SlotUserDto;
import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.EventUser;
import com.gatherr.backend.model.User;
import com.gatherr.backend.model.enums.EventType;
import com.gatherr.backend.repository.EventRepository;
import com.gatherr.backend.repository.EventUserRepository;
import com.gatherr.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Trip events (issue #148) reuse respond and summary: range keys in, counts per range out. */
@ExtendWith(MockitoExtension.class)
class AvailabilityServiceTripTest {

    private static final String SHORT_ID = "sunny-rome-trip-123456";
    private static final String DEC_1_3 = "01122026-03122026";
    private static final String DEC_14_18 = "14122026-18122026";
    private static final String DEC_23_26 = "23122026-26122026";

    @Mock
    private EventRepository eventRepository;
    @Mock
    private EventUserRepository eventUserRepository;
    @Mock
    private UserRepository userRepository;
    @InjectMocks
    private AvailabilityService availabilityService;

    private Event event;
    private User olivia;
    private User pat;
    private User kim;

    @BeforeEach
    void setUp() {
        olivia = User.builder().id(1L).name("Olivia").build();
        pat = User.builder().id(2L).name("Pat").build();
        kim = User.builder().id(3L).name("Kim").build();
        event = Event.builder()
                .id(10L)
                .shortId(SHORT_ID)
                .creator(olivia)
                .type(EventType.DATE_RANGES)
                .times(List.of(DEC_1_3, DEC_14_18, DEC_23_26))
                .timezone("Europe/Tallinn")
                .build();
    }

    @Test
    void respond_storesRangeKeysAsYesAndNo() {
        when(eventRepository.findByShortId(SHORT_ID)).thenReturn(Optional.of(event));
        when(eventUserRepository.findByEventShortIdAndUserId(SHORT_ID, 2L)).thenReturn(Optional.empty());
        when(userRepository.findById(2L)).thenReturn(Optional.of(pat));
        when(eventUserRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // A participant in another timezone: range keys have no time, so they are stored as sent.
        availabilityService.respond(2L, SHORT_ID, new RespondDto(List.of(DEC_14_18), List.of(DEC_1_3, DEC_23_26),
                "America/New_York"));

        ArgumentCaptor<EventUser> saved = ArgumentCaptor.forClass(EventUser.class);
        verify(eventUserRepository).save(saved.capture());
        assertThat(saved.getValue().getAvailable()).containsExactly(DEC_14_18);
        assertThat(saved.getValue().getNotAvailable()).containsExactly(DEC_1_3, DEC_23_26);
    }

    @Test
    void summary_countsYesPerRange_inEventOrder() {
        when(eventRepository.findByShortId(SHORT_ID)).thenReturn(Optional.of(event));
        when(eventUserRepository.findByEventShortId(SHORT_ID)).thenReturn(List.of(
                answer(olivia, List.of(DEC_1_3, DEC_14_18), List.of(DEC_23_26), "Europe/Tallinn"),
                answer(pat, List.of(DEC_14_18), List.of(DEC_1_3, DEC_23_26), "America/New_York"),
                answer(kim, List.of(DEC_14_18, DEC_23_26), List.of(DEC_1_3), null)));

        EventSummaryDto summary = availabilityService.getSummary(SHORT_ID);

        assertThat(summary.slots()).extracting(SlotSummaryDto::slot).containsExactly(DEC_1_3, DEC_14_18, DEC_23_26);
        assertThat(summary.slots()).extracting(SlotSummaryDto::count).containsExactly(1, 3, 1);
        assertThat(summary.slots().get(1).users()).extracting(SlotUserDto::name).containsExactly("Olivia", "Pat", "Kim");
        assertThat(summary.dateRound()).isNull();
    }

    private EventUser answer(User user, List<String> yes, List<String> no, String timezone) {
        return EventUser.builder().event(event).user(user).available(yes).notAvailable(no).timezone(timezone).build();
    }
}
