package com.gatherr.backend.service;

import com.gatherr.backend.dto.calendar.BusySlotDetailDto;
import com.gatherr.backend.util.SlotWindows;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.Error;
import com.google.api.services.calendar.model.FreeBusyCalendar;
import com.google.api.services.calendar.model.FreeBusyResponse;
import com.google.api.services.calendar.model.TimePeriod;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleCalendarServiceTest {

    private static final Instant NINE = Instant.parse("2026-12-01T09:00:00Z");

    private static TimePeriod period(Instant start, Instant end) {
        return new TimePeriod()
                .setStart(new DateTime(start.toEpochMilli()))
                .setEnd(new DateTime(end.toEpochMilli()));
    }

    private static Instant at(int minutesAfterNine) {
        return NINE.plusSeconds(minutesAfterNine * 60L);
    }

    @Test
    void requestsOnlyTheCalendarListAndFreeBusyScopes() {
        assertThat(GoogleCalendarService.SCOPES).containsExactly(
                CalendarScopes.CALENDAR_CALENDARLIST_READONLY,
                CalendarScopes.CALENDAR_EVENTS_FREEBUSY);
        assertThat(GoogleCalendarService.SCOPES).doesNotContain(CalendarScopes.CALENDAR_READONLY);
    }

    private static GoogleCalendarService.BusyPeriod busy(String calendarId, int fromMinute, int toMinute) {
        return new GoogleCalendarService.BusyPeriod(calendarId, new SlotWindows.Window(at(fromMinute), at(toMinute)));
    }

    /** 09:00–10:00 in four 15-minute slots. */
    private static Map<String, SlotWindows.Window> quarterSlots() {
        Map<String, SlotWindows.Window> slots = new LinkedHashMap<>();
        slots.put("0900", new SlotWindows.Window(at(0), at(15)));
        slots.put("0915", new SlotWindows.Window(at(15), at(30)));
        slots.put("0930", new SlotWindows.Window(at(30), at(45)));
        slots.put("0945", new SlotWindows.Window(at(45), at(60)));
        return slots;
    }

    private static final Map<String, String> NAMES = GoogleCalendarService.calendarNames(
            List.of("work", "home"), Map.of("work", "Work", "home", "Home"));

    @Test
    void busyPeriods_readsBusyPeriodsFromEveryCalendarWithItsId() {
        FreeBusyResponse response = new FreeBusyResponse().setCalendars(Map.of(
                "work", new FreeBusyCalendar().setBusy(List.of(period(at(0), at(30)))),
                "home", new FreeBusyCalendar().setBusy(List.of(period(at(60), at(90))))));

        assertThat(GoogleCalendarService.busyPeriods(response, 1L)).containsExactlyInAnyOrder(
                busy("work", 0, 30),
                busy("home", 60, 90));
    }

    @Test
    void busyPeriods_skipsCalendarsGoogleReportsAnErrorFor() {
        FreeBusyResponse response = new FreeBusyResponse().setCalendars(Map.of(
                "gone", new FreeBusyCalendar()
                        .setErrors(List.of(new Error().setDomain("global").setReason("notFound")))
                        .setBusy(List.of(period(at(0), at(30)))),
                "work", new FreeBusyCalendar().setBusy(List.of(period(at(60), at(90))))));

        assertThat(GoogleCalendarService.busyPeriods(response, 1L)).containsExactly(busy("work", 60, 90));
    }

    @Test
    void busyPeriods_handlesEmptyResponses() {
        assertThat(GoogleCalendarService.busyPeriods(new FreeBusyResponse(), 1L)).isEmpty();
        assertThat(GoogleCalendarService.busyPeriods(
                new FreeBusyResponse().setCalendars(Map.of("work", new FreeBusyCalendar())), 1L)).isEmpty();
    }

    @Test
    void busyDetails_oneCalendar_returnsOverlappingSlotsInEventOrderWithNameAndPeriod() {
        // Busy 09:10-09:30: touches 09:00 and 09:15; ending exactly at 09:30 leaves 09:30 free.
        List<BusySlotDetailDto> details = GoogleCalendarService.busyDetails(
                quarterSlots(), List.of(busy("work", 10, 30)), NAMES);

        assertThat(details).containsExactly(
                new BusySlotDetailDto("0900", List.of("Work"), at(10), at(30)),
                new BusySlotDetailDto("0915", List.of("Work"), at(10), at(30)));
    }

    @Test
    void busyDetails_twoCalendarsInOneSlot_listsBothAndSpansEarliestStartToLatestEnd() {
        // Home 08:50-09:05 and Work 09:10-09:20 both overlap 09:00; Work alone overlaps 09:15.
        List<BusySlotDetailDto> details = GoogleCalendarService.busyDetails(
                quarterSlots(), List.of(busy("work", 10, 20), busy("home", -10, 5)), NAMES);

        assertThat(details).containsExactly(
                new BusySlotDetailDto("0900", List.of("Work", "Home"), at(-10), at(20)),
                new BusySlotDetailDto("0915", List.of("Work"), at(10), at(20)));
    }

    @Test
    void busyDetails_calendarWithErrorsIsSkipped() {
        FreeBusyResponse response = new FreeBusyResponse().setCalendars(Map.of(
                "gone", new FreeBusyCalendar()
                        .setErrors(List.of(new Error().setDomain("global").setReason("notFound")))
                        .setBusy(List.of(period(at(0), at(60)))),
                "home", new FreeBusyCalendar().setBusy(List.of(period(at(30), at(45))))));

        List<BusySlotDetailDto> details = GoogleCalendarService.busyDetails(
                quarterSlots(), GoogleCalendarService.busyPeriods(response, 1L), NAMES);

        assertThat(details).containsExactly(new BusySlotDetailDto("0930", List.of("Home"), at(30), at(45)));
    }

    @Test
    void calendarNames_usesTheSummaryAndFallsBackToTheId() {
        assertThat(GoogleCalendarService.calendarNames(
                List.of("abc@group.calendar.google.com", "work"), Map.of("work", "Work")))
                .containsExactly(
                        Map.entry("abc@group.calendar.google.com", "abc@group.calendar.google.com"),
                        Map.entry("work", "Work"));
    }
}
