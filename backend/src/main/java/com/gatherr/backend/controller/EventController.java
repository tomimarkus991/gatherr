package com.gatherr.backend.controller;

import com.gatherr.backend.dto.ConfirmEventDto;
import com.gatherr.backend.dto.CreateEventDto;
import com.gatherr.backend.dto.EventResponseDto;
import com.gatherr.backend.dto.StartTimeRoundDto;
import com.gatherr.backend.dto.UpdateEventDto;
import com.gatherr.backend.service.EventService;
import com.gatherr.backend.util.JwtUtils;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {
    private final EventService eventService;

    @PostMapping
    public ResponseEntity<EventResponseDto> createEvent(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateEventDto createEventDto
    ) {
        Long creatorId = JwtUtils.extractUserId(jwt);
        EventResponseDto response = eventService.createEvent(creatorId, createEventDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/mine")
    public ResponseEntity<List<EventResponseDto>> getMyEvents(
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long creatorId = JwtUtils.extractUserId(jwt);
        List<EventResponseDto> response = eventService.getMyEvents(creatorId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{shortId}")
    public ResponseEntity<EventResponseDto> getEventByShortId(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String shortId
    ) {
        EventResponseDto response = eventService.getEventByShortId(shortId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{shortId}")
    public ResponseEntity<EventResponseDto> updateEvent(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String shortId,
            @RequestBody UpdateEventDto updateEventDto
    ) {
        Long creatorId = JwtUtils.extractUserId(jwt);
        EventResponseDto updatedEvent = eventService.updateEvent(creatorId, shortId, updateEventDto);
        return ResponseEntity.ok(updatedEvent);
    }

    @PostMapping("/{shortId}/confirm")
    public ResponseEntity<EventResponseDto> confirmEvent(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String shortId,
            @Valid @RequestBody ConfirmEventDto confirmEventDto
    ) {
        Long userId = JwtUtils.extractUserId(jwt);
        EventResponseDto confirmedEvent = eventService.confirmEvent(userId, shortId, confirmEventDto);
        return ResponseEntity.ok(confirmedEvent);
    }

    @PostMapping("/{shortId}/time-round")
    public ResponseEntity<EventResponseDto> startTimeRound(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String shortId,
            @Valid @RequestBody StartTimeRoundDto startTimeRoundDto
    ) {
        Long userId = JwtUtils.extractUserId(jwt);
        return ResponseEntity.ok(eventService.startTimeRound(userId, shortId, startTimeRoundDto));
    }

    @DeleteMapping("/{shortId}")
    public ResponseEntity<Void> deleteEvent(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String shortId
    ) {
        Long creatorId = JwtUtils.extractUserId(jwt);
        eventService.deleteEvent(creatorId, shortId);
        return ResponseEntity.noContent().build();
    }
}
