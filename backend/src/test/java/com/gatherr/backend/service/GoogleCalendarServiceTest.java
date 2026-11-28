package com.gatherr.backend.service;

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
                CalendarScopes.CALENDAR_FREEBUSY);
        assertThat(GoogleCalendarService.SCOPES).doesNotContain(CalendarScopes.CALENDAR_READONLY);
    }

    @Test
    void busyWindows_readsBusyPeriodsFromEveryCalendar() {
        FreeBusyResponse response = new FreeBusyResponse().setCalendars(Map.of(
                "work", new FreeBusyCalendar().setBusy(List.of(period(at(0), at(30)))),
                "home", new FreeBusyCalendar().setBusy(List.of(period(at(60), at(90))))));

        assertThat(GoogleCalendarService.busyWindows(response, 1L)).containsExactlyInAnyOrder(
                new SlotWindows.Window(at(0), at(30)),
                new SlotWindows.Window(at(60), at(90)));
    }

    @Test
    void busyWindows_skipsCalendarsGoogleReportsAnErrorFor() {
        FreeBusyResponse response = new FreeBusyResponse().setCalendars(Map.of(
                "gone", new FreeBusyCalendar()
                        .setErrors(List.of(new Error().setDomain("global").setReason("notFound")))
                        .setBusy(List.of(period(at(0), at(30)))),
                "work", new FreeBusyCalendar().setBusy(List.of(period(at(60), at(90))))));

        assertThat(GoogleCalendarService.busyWindows(response, 1L))
                .containsExactly(new SlotWindows.Window(at(60), at(90)));
    }

    @Test
    void busyWindows_handlesEmptyResponses() {
        assertThat(GoogleCalendarService.busyWindows(new FreeBusyResponse(), 1L)).isEmpty();
        assertThat(GoogleCalendarService.busyWindows(
                new FreeBusyResponse().setCalendars(Map.of("work", new FreeBusyCalendar())), 1L)).isEmpty();
    }

    @Test
    void overlappingSlots_returnsSlotsThatOverlapABusyWindowInEventOrder() {
        Map<String, SlotWindows.Window> slots = new LinkedHashMap<>();
        slots.put("09:00", new SlotWindows.Window(at(0), at(15)));
        slots.put("09:15", new SlotWindows.Window(at(15), at(30)));
        slots.put("09:30", new SlotWindows.Window(at(30), at(45)));
        slots.put("09:45", new SlotWindows.Window(at(45), at(60)));

        // Busy 09:10-09:30: touches 09:00 and 09:15; ending exactly at 09:30 leaves 09:30 free.
        List<SlotWindows.Window> busy = List.of(new SlotWindows.Window(at(10), at(30)));

        assertThat(GoogleCalendarService.overlappingSlots(slots, busy)).containsExactly("09:00", "09:15");
    }
}
