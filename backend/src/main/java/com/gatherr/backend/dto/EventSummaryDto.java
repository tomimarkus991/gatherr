package com.gatherr.backend.dto;

import java.util.List;

/** {@code dateRound} is set only once the event's time round has started (issue #94). */
public record EventSummaryDto(
        List<EventUserDto> users,
        List<SlotSummaryDto> slots,
        DateRoundSummaryDto dateRound
) {}
