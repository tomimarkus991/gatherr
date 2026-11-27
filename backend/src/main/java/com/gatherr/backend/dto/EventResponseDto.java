package com.gatherr.backend.dto;

import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.enums.EventType;
import java.time.OffsetDateTime;
import java.util.List;

public record EventResponseDto(
        Long id,
        String name,
        String description,
        String shortId,
        Long creatorId,
        EventType type,
        List<String> times,
        int timeIncrement,
        String timezone,
        int respondedCount,
        OffsetDateTime confirmedAt,
        OffsetDateTime confirmedStart,
        OffsetDateTime confirmedEnd
) {
    public static EventResponseDto from(Event event) {
        int respondedCount = event.getEventUsers() == null ? 0 : (int) event.getEventUsers().stream()
                .filter(eu -> !eu.getAvailable().isEmpty() || !eu.getNotAvailable().isEmpty())
                .count();

        return new EventResponseDto(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getShortId(),
                event.getCreator() != null ? event.getCreator().getId() : null,
                event.getType(),
                event.getTimes(),
                event.getTimeIncrement(),
                event.getTimezone(),
                respondedCount,
                event.getConfirmedAt(),
                event.getConfirmedStart(),
                event.getConfirmedEnd()
        );
    }
}