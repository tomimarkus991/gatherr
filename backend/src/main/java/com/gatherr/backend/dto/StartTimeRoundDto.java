package com.gatherr.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Starts an event's time round on one of its dates. {@code date} is a date slot key
 * ({@code ddMMyyyy}, for example {@code "31032026"}); {@code startTime} and {@code endTime} are
 * {@code HH:mm} in the event timezone. Like the create page, the end time is the last slot's start:
 * 18:00–19:00 in 30-minute steps gives 18:00, 18:30 and 19:00.
 */
public record StartTimeRoundDto(
        @NotBlank String date,
        @NotNull @Pattern(regexp = TIME) String startTime,
        @NotNull @Pattern(regexp = TIME) String endTime,
        @NotNull Integer timeIncrement
) {
    static final String TIME = "([01]\\d|2[0-3]):[0-5]\\d";
}
