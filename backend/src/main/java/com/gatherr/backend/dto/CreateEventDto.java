package com.gatherr.backend.dto;

import com.gatherr.backend.model.enums.EventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import com.gatherr.backend.model.RangeDetail;
import java.util.List;
import java.util.Map;

@Setter
@Getter
public class CreateEventDto {
    @NotBlank
    private String name;

    private String description;

    @NotNull
    private EventType type;

    @NotEmpty
    private List<String> times;

    @NotBlank
    private String timezone;

    @NotNull
    private Integer timeIncrement;

    /** Trip events only: optional label and link per range key in {@code times}. */
    private Map<String, RangeDetail> rangeDetails;
}
