package com.gatherr.backend.util;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.regex.Pattern;

/**
 * A trip event's date range, both days included. Its slot key is {@code ddMMyyyy-ddMMyyyy},
 * for example {@code "01122026-03122026"} for 1–3 December 2026 (issue #148).
 */
public record DateRange(LocalDate start, LocalDate end) {

    private static final Pattern KEY = Pattern.compile("\\d{8}-\\d{8}");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("ddMMuuuu")
            .withResolverStyle(ResolverStyle.STRICT);

    /** Parses a range key; throws {@link IllegalArgumentException} if it is malformed or ends before it starts. */
    public static DateRange parse(String key) {
        if (key == null || !KEY.matcher(key).matches()) {
            throw new IllegalArgumentException("Invalid date range: " + key);
        }
        try {
            LocalDate start = LocalDate.parse(key.substring(0, 8), DATE);
            LocalDate end = LocalDate.parse(key.substring(9), DATE);
            if (end.isBefore(start)) {
                throw new IllegalArgumentException("Date range ends before it starts: " + key);
            }
            return new DateRange(start, end);
        } catch (DateTimeException e) {
            throw new IllegalArgumentException("Invalid date range: " + key, e);
        }
    }

    public String key() {
        return DATE.format(start) + "-" + DATE.format(end);
    }
}
