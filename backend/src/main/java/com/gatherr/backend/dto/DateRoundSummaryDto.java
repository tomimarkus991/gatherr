package com.gatherr.backend.dto;

import java.util.List;

/**
 * The date round's heatmap, kept read-only once the time round starts. {@code respondentCount} is
 * how many people answered the date round.
 */
public record DateRoundSummaryDto(
        int respondentCount,
        List<SlotSummaryDto> slots
) {}
