package com.gatherr.backend.util;

import com.gatherr.backend.model.enums.EventType;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;

/**
 * Turns an event slot key into real time in the event's timezone.
 *
 * <pre>
 * SPECIFIC_DATES_AND_TIMES  HHmm-ddMMyyyy  "0900-31032026"
 * SPECIFIC_DATES            ddMMyyyy       "31032026"       (all day)
 * WEEKDAYS_AND_TIMES        HHmm-DDD       "0900-MON"
 * WEEKDAYS                  DDD            "MON"            (all day)
 * DATE_RANGES               ddMMyyyy-ddMMyyyy "01122026-03122026" (all day, first to last day)
 * </pre>
 *
 * Weekday slots have no date, so they map to the next occurrence of that weekday,
 * counted from today in the event's timezone. Today counts unless a timed slot has
 * already started, in which case it moves to the same weekday next week.
 */
public final class SlotTimes {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("ddMMuuuu")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HHmm")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final Map<String, DayOfWeek> WEEKDAYS = Map.of(
            "MON", DayOfWeek.MONDAY,
            "TUE", DayOfWeek.TUESDAY,
            "WED", DayOfWeek.WEDNESDAY,
            "THU", DayOfWeek.THURSDAY,
            "FRI", DayOfWeek.FRIDAY,
            "SAT", DayOfWeek.SATURDAY,
            "SUN", DayOfWeek.SUNDAY
    );

    private SlotTimes() {}

    public static ConfirmedSlot resolve(EventType type, String slot, ZoneId zone, int incrementMinutes, Clock clock) {
        try {
            return switch (type) {
                case SPECIFIC_DATES_AND_TIMES -> {
                    String[] parts = splitTimeAndDay(slot);
                    yield timed(LocalDate.parse(parts[1], DATE).atTime(LocalTime.parse(parts[0], TIME)).atZone(zone),
                            incrementMinutes);
                }
                case SPECIFIC_DATES -> allDay(LocalDate.parse(slot, DATE), zone);
                case WEEKDAYS_AND_TIMES -> {
                    String[] parts = splitTimeAndDay(slot);
                    LocalTime time = LocalTime.parse(parts[0], TIME);
                    ZonedDateTime now = ZonedDateTime.now(clock.withZone(zone));
                    ZonedDateTime start = nextOrSame(now.toLocalDate(), parts[1]).atTime(time).atZone(zone);
                    if (start.isBefore(now)) {
                        start = start.plusWeeks(1);
                    }
                    yield timed(start, incrementMinutes);
                }
                case WEEKDAYS -> allDay(nextOrSame(LocalDate.now(clock.withZone(zone)), slot), zone);
                case DATE_RANGES -> {
                    DateRange range = DateRange.parse(slot);
                    yield new ConfirmedSlot(range.start().atStartOfDay(zone),
                            range.end().plusDays(1).atStartOfDay(zone), true);
                }
            };
        } catch (DateTimeException | IllegalArgumentException e) {
            throw invalid(slot);
        }
    }

    private static String[] splitTimeAndDay(String slot) {
        String[] parts = slot.split("-", 2);
        if (parts.length != 2) {
            throw invalid(slot);
        }
        return parts;
    }

    private static LocalDate nextOrSame(LocalDate today, String day) {
        DayOfWeek dayOfWeek = WEEKDAYS.get(day);
        if (dayOfWeek == null) {
            throw new IllegalArgumentException("Unknown weekday: " + day);
        }
        return today.with(TemporalAdjusters.nextOrSame(dayOfWeek));
    }

    private static ConfirmedSlot timed(ZonedDateTime start, int incrementMinutes) {
        return new ConfirmedSlot(start, start.plusMinutes(incrementMinutes), false);
    }

    private static ConfirmedSlot allDay(LocalDate date, ZoneId zone) {
        return new ConfirmedSlot(date.atStartOfDay(zone), date.plusDays(1).atStartOfDay(zone), true);
    }

    private static ResponseStatusException invalid(String slot) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid slot: " + slot);
    }
}
