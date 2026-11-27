package com.gatherr.backend.util;

import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class IcsBuilderTest {

    private static final ZoneId TALLINN = ZoneId.of("Europe/Tallinn");
    private static final Instant DTSTAMP = Instant.parse("2026-11-27T12:00:00Z");

    private User organiser;
    private User participant;
    private Event event;

    @BeforeEach
    void setUp() {
        organiser = User.builder().id(1L).name("Olivia Organiser").email("olivia@example.com").build();
        participant = User.builder().id(2L).name("Pat Participant").email("pat@example.com").build();
        event = Event.builder()
                .id(10L)
                .name("Team lunch")
                .shortId("happy-blue-fox-123456")
                .creator(organiser)
                .timezone("Europe/Tallinn")
                .build();
    }

    @Test
    void timedSlot_producesMinimalVeventInUtcWithCrlfLineEndings() {
        ConfirmedSlot slot = new ConfirmedSlot(
                ZonedDateTime.of(2026, 3, 31, 9, 0, 0, 0, TALLINN),
                ZonedDateTime.of(2026, 3, 31, 9, 30, 0, 0, TALLINN),
                false);

        String ics = IcsBuilder.build(event, slot, List.of(organiser, participant), DTSTAMP);

        assertThat(ics).isEqualTo(String.join("\r\n",
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//Gatherr//Gatherr//EN",
                "CALSCALE:GREGORIAN",
                "METHOD:PUBLISH",
                "BEGIN:VEVENT",
                "UID:happy-blue-fox-123456@gatherr.alber.ee",
                "DTSTAMP:20261127T120000Z",
                "DTSTART:20260331T060000Z",
                "DTEND:20260331T063000Z",
                "SUMMARY:Team lunch",
                "ORGANIZER;CN=Olivia Organiser:mailto:olivia@example.com",
                "ATTENDEE;CN=Olivia Organiser;ROLE=REQ-PARTICIPANT:mailto:olivia@example.com",
                "ATTENDEE;CN=Pat Participant;ROLE=REQ-PARTICIPANT:mailto:pat@example.com",
                "END:VEVENT",
                "END:VCALENDAR",
                ""));
    }

    @Test
    void allDaySlot_usesDateValues_withExclusiveEnd() {
        ConfirmedSlot slot = new ConfirmedSlot(
                ZonedDateTime.of(2026, 3, 31, 0, 0, 0, 0, TALLINN),
                ZonedDateTime.of(2026, 4, 1, 0, 0, 0, 0, TALLINN),
                true);

        String ics = IcsBuilder.build(event, slot, List.of(participant), DTSTAMP);

        assertThat(ics).contains("\r\nDTSTART;VALUE=DATE:20260331\r\n");
        assertThat(ics).contains("\r\nDTEND;VALUE=DATE:20260401\r\n");
    }

    @Test
    void textAndParameterValuesAreEscaped() {
        event.setName("Lunch; drinks, and\nmore \\ fun");
        organiser.setName("Doe, Jane");
        ConfirmedSlot slot = new ConfirmedSlot(
                ZonedDateTime.of(2026, 3, 31, 9, 0, 0, 0, TALLINN),
                ZonedDateTime.of(2026, 3, 31, 9, 30, 0, 0, TALLINN),
                false);

        String ics = IcsBuilder.build(event, slot, List.of(organiser), DTSTAMP);

        assertThat(ics).contains("\r\nSUMMARY:Lunch\\; drinks\\, and\\nmore \\\\ fun\r\n");
        assertThat(ics).contains("\r\nORGANIZER;CN=\"Doe, Jane\":mailto:olivia@example.com\r\n");
    }

    @Test
    void longLinesAreFoldedAt75Octets() {
        event.setName("A".repeat(200));
        ConfirmedSlot slot = new ConfirmedSlot(
                ZonedDateTime.of(2026, 3, 31, 9, 0, 0, 0, TALLINN),
                ZonedDateTime.of(2026, 3, 31, 9, 30, 0, 0, TALLINN),
                false);

        String ics = IcsBuilder.build(event, slot, List.of(organiser), DTSTAMP);

        for (String line : ics.split("\r\n")) {
            assertThat(line.getBytes(StandardCharsets.UTF_8).length).isLessThanOrEqualTo(75);
        }
        String unfolded = ics.replace("\r\n ", "");
        assertThat(unfolded).contains("SUMMARY:" + "A".repeat(200) + "\r\n");
    }
}
