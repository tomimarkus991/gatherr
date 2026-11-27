package com.gatherr.backend.util;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class SlotWindowsTest {

    private static final ZoneId TALLINN = ZoneId.of("Europe/Tallinn"); // UTC+3 in summer
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 6, 10);

    @Test
    void dateAndTimeSlotIsInTheEventTimezone() {
        assertThat(SlotWindows.of("0900-01062026", TALLINN, 30, WEDNESDAY))
                .contains(new SlotWindows.Window(Instant.parse("2026-06-01T06:00:00Z"), Instant.parse("2026-06-01T06:30:00Z")));
    }

    @Test
    void dateSlotCoversTheWholeDay() {
        assertThat(SlotWindows.of("01062026", TALLINN, 30, WEDNESDAY))
                .contains(new SlotWindows.Window(Instant.parse("2026-05-31T21:00:00Z"), Instant.parse("2026-06-01T21:00:00Z")));
    }

    @Test
    void weekdayAndTimeSlotMapsToTheNextOccurrence() {
        assertThat(SlotWindows.of("0900-FRI", TALLINN, 60, WEDNESDAY))
                .contains(new SlotWindows.Window(Instant.parse("2026-06-12T06:00:00Z"), Instant.parse("2026-06-12T07:00:00Z")));
    }

    @Test
    void weekdaySlotForTodayMeansToday() {
        assertThat(SlotWindows.of("WED", TALLINN, 30, WEDNESDAY))
                .contains(new SlotWindows.Window(Instant.parse("2026-06-09T21:00:00Z"), Instant.parse("2026-06-10T21:00:00Z")));
    }

    @Test
    void earlierWeekdayRollsToNextWeek() {
        assertThat(SlotWindows.of("MON", TALLINN, 30, WEDNESDAY).map(SlotWindows.Window::start))
                .contains(Instant.parse("2026-06-14T21:00:00Z"));
    }

    @Test
    void unparseableSlotIsEmpty() {
        assertThat(SlotWindows.of("nonsense", TALLINN, 30, WEDNESDAY)).isEmpty();
        assertThat(SlotWindows.of("2500-01062026", TALLINN, 30, WEDNESDAY)).isEmpty();
    }
}
