package com.gatherr.backend.model.enums;

/**
 * Which round a two-step event is in (issue #94). A new {@code SPECIFIC_DATES} event is in the
 * date round; once the organiser picks a date it is in the time round, for good. Other events
 * have no round.
 */
public enum EventRound {
    DATE,
    TIME
}
