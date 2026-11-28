package com.gatherr.backend.dto.calendar;

import java.util.List;

/**
 * Busy event slots from a calendar import. {@code busySlots} is kept for older clients;
 * {@code busyDetails} says, per busy slot, which calendars are busy and when.
 */
public record BusySlotsDto(List<String> busySlots, List<BusySlotDetailDto> busyDetails) {}
