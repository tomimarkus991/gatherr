package com.gatherr.backend.util;

import java.time.ZonedDateTime;

/**
 * A confirmed slot as real time in the event's timezone. For an all-day slot, start is
 * midnight and end is the next midnight (exclusive).
 */
public record ConfirmedSlot(ZonedDateTime start, ZonedDateTime end, boolean allDay) {}
