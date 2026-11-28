package com.gatherr.backend.util;

import com.gatherr.backend.model.RangeDetail;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Checks a new trip event's range keys and its optional label and link per range (issue #148). */
public final class TripRanges {

    public static final int MAX_LABEL_LENGTH = 200;
    public static final int MAX_LINK_LENGTH = 2000;

    private TripRanges() {}

    /**
     * Every key must be a distinct {@link DateRange} key; ranges may overlap. Details may only name
     * keys from {@code times}. Returns the details trimmed, without empty entries, or null if none are left.
     */
    public static Map<String, RangeDetail> validate(List<String> times, Map<String, RangeDetail> details) {
        Set<String> keys = new HashSet<>();
        for (String key : times) {
            try {
                DateRange.parse(key);
            } catch (IllegalArgumentException e) {
                throw badRequest(e.getMessage());
            }
            if (!keys.add(key)) {
                throw badRequest("Duplicate date range: " + key);
            }
        }
        if (details == null) {
            return null;
        }

        Map<String, RangeDetail> cleaned = new LinkedHashMap<>();
        for (Map.Entry<String, RangeDetail> entry : details.entrySet()) {
            if (!keys.contains(entry.getKey())) {
                throw badRequest("Range details name a range that is not one of the event's times: " + entry.getKey());
            }
            RangeDetail detail = entry.getValue();
            String label = blankToNull(detail == null ? null : detail.label());
            String link = blankToNull(detail == null ? null : detail.link());
            if (label != null && label.length() > MAX_LABEL_LENGTH) {
                throw badRequest("Label is longer than " + MAX_LABEL_LENGTH + " characters");
            }
            if (link != null) {
                checkLink(link);
            }
            if (label != null || link != null) {
                cleaned.put(entry.getKey(), new RangeDetail(label, link));
            }
        }
        return cleaned.isEmpty() ? null : cleaned;
    }

    private static void checkLink(String link) {
        if (link.length() > MAX_LINK_LENGTH) {
            throw badRequest("Link is longer than " + MAX_LINK_LENGTH + " characters");
        }
        try {
            URI uri = new URI(link);
            String scheme = uri.getScheme();
            if (scheme == null
                    || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                    || uri.getHost() == null) {
                throw badRequest("Link must be an http or https URL");
            }
        } catch (URISyntaxException e) {
            throw badRequest("Link must be an http or https URL");
        }
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
