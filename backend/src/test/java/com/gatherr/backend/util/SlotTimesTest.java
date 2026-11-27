package com.gatherr.backend.util;

import com.gatherr.backend.model.enums.EventType;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SlotTimesTest {

    private static final ZoneId TALLINN = ZoneId.of("Europe/Tallinn");
    // Friday 2026-11-27 12:00 UTC = 14:00 in Tallinn
    private static final Clock FRIDAY_NOON_UTC = Clock.fixed(Instant.parse("2026-11-27T12:00:00Z"), ZoneOffset.UTC);

    @Test
    void specificDateAndTime_startsAtSlotInEventZone_andEndsAfterIncrement() {
        ConfirmedSlot slot = SlotTimes.resolve(EventType.SPECIFIC_DATES_AND_TIMES, "0900-31032026", TALLINN, 30, FRIDAY_NOON_UTC);

        assertThat(slot.allDay()).isFalse();
        assertThat(slot.start()).isEqualTo(ZonedDateTime.of(2026, 3, 31, 9, 0, 0, 0, TALLINN));
        assertThat(slot.end()).isEqualTo(ZonedDateTime.of(2026, 3, 31, 9, 30, 0, 0, TALLINN));
        assertThat(slot.start().toInstant()).isEqualTo(Instant.parse("2026-03-31T06:00:00Z"));
    }

    @Test
    void specificDate_isAllDay_fromMidnightToNextMidnight() {
        ConfirmedSlot slot = SlotTimes.resolve(EventType.SPECIFIC_DATES, "31032026", TALLINN, 30, FRIDAY_NOON_UTC);

        assertThat(slot.allDay()).isTrue();
        assertThat(slot.start()).isEqualTo(ZonedDateTime.of(2026, 3, 31, 0, 0, 0, 0, TALLINN));
        assertThat(slot.end()).isEqualTo(ZonedDateTime.of(2026, 4, 1, 0, 0, 0, 0, TALLINN));
    }

    @Test
    void weekdayAndTime_mapsToNextOccurrenceOfThatWeekday() {
        ConfirmedSlot slot = SlotTimes.resolve(EventType.WEEKDAYS_AND_TIMES, "0900-MON", TALLINN, 60, FRIDAY_NOON_UTC);

        assertThat(slot.allDay()).isFalse();
        assertThat(slot.start()).isEqualTo(ZonedDateTime.of(2026, 11, 30, 9, 0, 0, 0, TALLINN));
        assertThat(slot.end()).isEqualTo(ZonedDateTime.of(2026, 11, 30, 10, 0, 0, 0, TALLINN));
    }

    @Test
    void weekdayAndTime_usesTodayWhenTheTimeIsStillAhead() {
        ConfirmedSlot slot = SlotTimes.resolve(EventType.WEEKDAYS_AND_TIMES, "1600-FRI", TALLINN, 30, FRIDAY_NOON_UTC);

        assertThat(slot.start()).isEqualTo(ZonedDateTime.of(2026, 11, 27, 16, 0, 0, 0, TALLINN));
    }

    @Test
    void weekdayAndTime_skipsToNextWeekWhenTodaysTimeHasPassed() {
        ConfirmedSlot slot = SlotTimes.resolve(EventType.WEEKDAYS_AND_TIMES, "1000-FRI", TALLINN, 30, FRIDAY_NOON_UTC);

        assertThat(slot.start()).isEqualTo(ZonedDateTime.of(2026, 12, 4, 10, 0, 0, 0, TALLINN));
    }

    @Test
    void weekday_isAllDay_andTodayCounts() {
        ConfirmedSlot slot = SlotTimes.resolve(EventType.WEEKDAYS, "FRI", TALLINN, 30, FRIDAY_NOON_UTC);

        assertThat(slot.allDay()).isTrue();
        assertThat(slot.start()).isEqualTo(ZonedDateTime.of(2026, 11, 27, 0, 0, 0, 0, TALLINN));
        assertThat(slot.end()).isEqualTo(ZonedDateTime.of(2026, 11, 28, 0, 0, 0, 0, TALLINN));
    }

    @Test
    void weekday_usesTodayInTheEventZone_notUtc() {
        // Thursday 23:30 UTC is already Friday 01:30 in Tallinn
        Clock thursdayLateUtc = Clock.fixed(Instant.parse("2026-11-26T23:30:00Z"), ZoneOffset.UTC);

        ConfirmedSlot slot = SlotTimes.resolve(EventType.WEEKDAYS, "FRI", TALLINN, 30, thursdayLateUtc);

        assertThat(slot.start().toLocalDate()).isEqualTo(java.time.LocalDate.of(2026, 11, 27));
    }

    @Test
    void malformedSlot_isRejectedWith400() {
        assertThatThrownBy(() -> SlotTimes.resolve(EventType.SPECIFIC_DATES_AND_TIMES, "MON", TALLINN, 30, FRIDAY_NOON_UTC))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");
    }
}
