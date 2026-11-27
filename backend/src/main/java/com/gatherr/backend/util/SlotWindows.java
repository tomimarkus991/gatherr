package com.gatherr.backend.util;

import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;
import java.util.Optional;

/**
 * Turns an event slot into the time window it stands for, in the event's timezone.
 *
 * <pre>
 * SPECIFIC_DATES_AND_TIMES  "0900-31032026"  → 09:00 + increment on that date
 * SPECIFIC_DATES            "31032026"       → that whole day
 * WEEKDAYS_AND_TIMES        "0900-MON"       → 09:00 + increment on the next Monday (today counts)
 * WEEKDAYS                  "MON"            → the whole next Monday (today counts)
 * </pre>
 */
public final class SlotWindows {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("ddMMyyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HHmm");
    private static final Map<String, DayOfWeek> WEEKDAYS = Map.of(
            "MON", DayOfWeek.MONDAY, "TUE", DayOfWeek.TUESDAY, "WED", DayOfWeek.WEDNESDAY,
            "THU", DayOfWeek.THURSDAY, "FRI", DayOfWeek.FRIDAY, "SAT", DayOfWeek.SATURDAY,
            "SUN", DayOfWeek.SUNDAY);

    public record Window(Instant start, Instant end) {
        public boolean overlaps(Window other) {
            return start.isBefore(other.end) && end.isAfter(other.start);
        }
    }

    private SlotWindows() {}

    public static Optional<Window> of(String slot, ZoneId zone, int incrementMinutes, LocalDate today) {
        if (slot == null) return Optional.empty();
        String[] parts = slot.split("-", 2);
        String timePart = parts.length == 2 ? parts[0] : null;
        String dayPart = parts.length == 2 ? parts[1] : parts[0];

        try {
            LocalDate date = WEEKDAYS.containsKey(dayPart)
                    ? today.with(TemporalAdjusters.nextOrSame(WEEKDAYS.get(dayPart)))
                    : LocalDate.parse(dayPart, DATE);

            if (timePart == null) {
                return Optional.of(new Window(
                        date.atStartOfDay(zone).toInstant(),
                        date.plusDays(1).atStartOfDay(zone).toInstant()));
            }

            Instant start = date.atTime(LocalTime.parse(timePart, TIME)).atZone(zone).toInstant();
            return Optional.of(new Window(start, start.plusSeconds(incrementMinutes * 60L)));
        } catch (DateTimeException e) { // includes DateTimeParseException
            return Optional.empty();
        }
    }
}
