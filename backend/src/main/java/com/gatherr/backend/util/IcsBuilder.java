package com.gatherr.backend.util;

import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.User;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds a minimal RFC 5545 calendar with one VEVENT for a confirmed slot. Times are
 * written in UTC; an all-day slot uses DATE values with an exclusive end date.
 */
public final class IcsBuilder {

    private static final String CRLF = "\r\n";
    private static final int MAX_LINE_OCTETS = 75;
    private static final DateTimeFormatter UTC_DATE_TIME = DateTimeFormatter.ofPattern("uuuuMMdd'T'HHmmss'Z'")
            .withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("uuuuMMdd");

    private IcsBuilder() {}

    public static String build(Event event, ConfirmedSlot slot, List<User> attendees, Instant dtstamp) {
        List<String> lines = new ArrayList<>();
        lines.add("BEGIN:VCALENDAR");
        lines.add("VERSION:2.0");
        lines.add("PRODID:-//Gatherr//Gatherr//EN");
        lines.add("CALSCALE:GREGORIAN");
        lines.add("METHOD:PUBLISH");
        lines.add("BEGIN:VEVENT");
        lines.add("UID:" + event.getShortId() + "@gatherr.alber.ee");
        lines.add("DTSTAMP:" + UTC_DATE_TIME.format(dtstamp));
        if (slot.allDay()) {
            lines.add("DTSTART;VALUE=DATE:" + DATE.format(slot.start().toLocalDate()));
            lines.add("DTEND;VALUE=DATE:" + DATE.format(slot.end().toLocalDate()));
        } else {
            lines.add("DTSTART:" + UTC_DATE_TIME.format(slot.start().toInstant()));
            lines.add("DTEND:" + UTC_DATE_TIME.format(slot.end().toInstant()));
        }
        lines.add("SUMMARY:" + escapeText(event.getName()));
        User organiser = event.getCreator();
        lines.add("ORGANIZER;CN=" + paramValue(organiser.getName()) + ":mailto:" + organiser.getEmail());
        for (User attendee : attendees) {
            lines.add("ATTENDEE;CN=" + paramValue(attendee.getName()) + ";ROLE=REQ-PARTICIPANT:mailto:"
                    + attendee.getEmail());
        }
        lines.add("END:VEVENT");
        lines.add("END:VCALENDAR");

        StringBuilder ics = new StringBuilder();
        for (String line : lines) {
            ics.append(fold(line)).append(CRLF);
        }
        return ics.toString();
    }

    /** TEXT value escaping (RFC 5545 section 3.3.11). */
    static String escapeText(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\r\n", "\\n")
                .replace("\n", "\\n")
                .replace("\r", "\\n");
    }

    /** Parameter values cannot hold DQUOTE or control characters and are quoted when they hold ; : or , */
    static String paramValue(String value) {
        if (value == null) {
            return "\"\"";
        }
        String cleaned = value.replace("\"", "").replaceAll("\\p{Cntrl}", " ");
        if (cleaned.contains(";") || cleaned.contains(":") || cleaned.contains(",")) {
            return "\"" + cleaned + "\"";
        }
        return cleaned;
    }

    /** Folds a content line so no physical line is longer than 75 octets (RFC 5545 section 3.1). */
    static String fold(String line) {
        if (line.getBytes(StandardCharsets.UTF_8).length <= MAX_LINE_OCTETS) {
            return line;
        }
        StringBuilder folded = new StringBuilder();
        int lineOctets = 0;
        int limit = MAX_LINE_OCTETS;
        int i = 0;
        while (i < line.length()) {
            int codePoint = line.codePointAt(i);
            int chars = Character.charCount(codePoint);
            int octets = line.substring(i, i + chars).getBytes(StandardCharsets.UTF_8).length;
            if (lineOctets + octets > limit) {
                folded.append(CRLF).append(' ');
                lineOctets = 1;
            }
            folded.appendCodePoint(codePoint);
            lineOctets += octets;
            i += chars;
        }
        return folded.toString();
    }
}
