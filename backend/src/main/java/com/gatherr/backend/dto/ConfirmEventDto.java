package com.gatherr.backend.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * The slot key the organiser confirms, in the event type's format, for example
 * {@code "0900-31032026"}. It must be one of the event's {@code times}.
 */
public record ConfirmEventDto(
        @NotBlank String slot
) {}
