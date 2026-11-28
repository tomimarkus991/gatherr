package com.gatherr.backend.dto.calendar;

import java.time.Instant;
import java.util.List;

/**
 * Why an event slot is busy: the names of the calendars busy in it, and the busy time that
 * overlaps it (earliest start to latest end when several periods overlap the slot).
 */
public record BusySlotDetailDto(String slot, List<String> calendars, Instant start, Instant end) {}
