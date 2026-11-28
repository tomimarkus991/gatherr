package com.gatherr.backend.util;

import com.gatherr.backend.model.RangeDetail;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TripRangesTest {

    @Test
    void parsesRangeKey_bothDaysIncluded() {
        assertThat(DateRange.parse("01122026-03122026"))
                .isEqualTo(new DateRange(LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 3)));
        assertThat(DateRange.parse("01122026-01122026").key()).isEqualTo("01122026-01122026");
    }

    @Test
    void rejectsMalformedKeys_andRangesEndingBeforeTheyStart() {
        for (String key : List.of("01122026", "0900-01122026", "1122026-3122026", "31022026-01032026",
                "01122026-03122026-04122026", "03122026-01122026")) {
            assertThatThrownBy(() -> DateRange.parse(key)).as(key).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void validRanges_mayOverlap_andDetailsAreTrimmed() {
        Map<String, RangeDetail> details = new HashMap<>();
        details.put("01122026-03122026", new RangeDetail("  Rome, Ryanair €89 ", " https://example.com/a "));
        details.put("02122026-04122026", new RangeDetail("  ", ""));

        Map<String, RangeDetail> cleaned = TripRanges.validate(
                List.of("01122026-03122026", "02122026-04122026"), details);

        assertThat(cleaned).containsExactly(Map.entry("01122026-03122026",
                new RangeDetail("Rome, Ryanair €89", "https://example.com/a")));
    }

    @Test
    void noDetails_returnsNull() {
        assertThat(TripRanges.validate(List.of("01122026-03122026"), null)).isNull();
        assertThat(TripRanges.validate(List.of("01122026-03122026"),
                Map.of("01122026-03122026", new RangeDetail(null, " ")))).isNull();
    }

    @Test
    void rejectsBadKeys_andDuplicates() {
        assertBadRequest(List.of("03122026-01122026"), null, "ends before it starts");
        assertBadRequest(List.of("0900-01122026"), null, "Invalid date range");
        assertBadRequest(List.of("01122026-03122026", "01122026-03122026"), null, "Duplicate");
    }

    @Test
    void rejectsDetailsForUnknownRange() {
        assertBadRequest(List.of("01122026-03122026"),
                Map.of("05122026-06122026", new RangeDetail("Rome", null)), "not one of the event's times");
    }

    @Test
    void acceptsOnlyHttpAndHttpsLinks() {
        for (String link : List.of("http://example.com", "https://example.com/flights?x=1", "HTTPS://EXAMPLE.COM")) {
            assertThat(TripRanges.validate(List.of("01122026-03122026"),
                    Map.of("01122026-03122026", new RangeDetail(null, link)))).as(link).isNotNull();
        }
        for (String link : List.of("javascript:alert(1)", "ftp://example.com", "example.com", "https://", "http://a b")) {
            assertBadRequest(List.of("01122026-03122026"),
                    Map.of("01122026-03122026", new RangeDetail(null, link)), "Link");
        }
    }

    @Test
    void rejectsTooLongLabel() {
        assertBadRequest(List.of("01122026-03122026"),
                Map.of("01122026-03122026", new RangeDetail("x".repeat(201), null)), "Label");
    }

    private static void assertBadRequest(List<String> times, Map<String, RangeDetail> details, String reason) {
        assertThatThrownBy(() -> TripRanges.validate(times, details))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400")
                .hasMessageContaining(reason);
    }
}
