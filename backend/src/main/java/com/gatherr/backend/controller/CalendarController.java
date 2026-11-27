package com.gatherr.backend.controller;

import com.gatherr.backend.dto.calendar.BusySlotsDto;
import com.gatherr.backend.dto.calendar.CalendarListDto;
import com.gatherr.backend.service.CalendarOAuthState;
import com.gatherr.backend.service.GoogleCalendarService;
import com.gatherr.backend.util.JwtUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@RequiredArgsConstructor
public class CalendarController {
    private final GoogleCalendarService calendarService;
    private final CalendarOAuthState oauthState;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @GetMapping("/auth/google/calendar")
    public ResponseEntity<Void> initiateCalendarAuth(@AuthenticationPrincipal Jwt jwt) {
        try {
            String authUrl = calendarService.buildAuthorizationUrl(JwtUtils.extractUserId(jwt));
            return ResponseEntity.status(302).location(URI.create(authUrl)).build();
        } catch (Exception e) {
            log.error("[CalendarController] Failed to build auth URL", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Google redirects the browser here after the user grants or denies consent. The redirect carries
     * no bearer token, so the endpoint is public and the user comes from the signed {@code state}.
     * Exchanges the code for tokens, stores them, then redirects to the frontend.
     */
    @GetMapping("/auth/google/calendar/callback")
    public ResponseEntity<Void> calendarCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error,
            @RequestParam(required = false) String state)
    {
        if (error != null || code == null) {
            log.warn("[CalendarController] OAuth callback error: {}", error);
            return redirectToFrontend("error=access_denied");
        }

        Optional<Long> userId = oauthState.verify(state);
        if (userId.isEmpty()) {
            log.warn("[CalendarController] OAuth callback with invalid or expired state");
            return redirectToFrontend("error=invalid_state");
        }

        try {
            calendarService.handleCallback(userId.get(), code);
            return redirectToFrontend("success=true");
        } catch (Exception e) {
            log.error("[CalendarController] Callback failed", e);
            return redirectToFrontend("error=server_error");
        }
    }

    private ResponseEntity<Void> redirectToFrontend(String query) {
        return ResponseEntity.status(302)
                .location(URI.create(frontendUrl + "/calendar-connect?" + query))
                .build();
    }

    /**
     * Returns the authenticated user's Google Calendar list.
     * Requires the user to have completed the OAuth flow first.
     */
    @GetMapping("/users/me/calendars")
    public ResponseEntity<CalendarListDto> listCalendars(@AuthenticationPrincipal Jwt jwt) {
        try {
            Long userId = JwtUtils.extractUserId(jwt);
            CalendarListDto response = calendarService.listCalendars(userId);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).build(); // No tokens stored — user hasn't connected Google Calendar yet
        } catch (Exception e) {
            log.error("[CalendarController] Failed to list calendars", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Returns slots from the event's candidate list that are busy in the user's
     * selected Google Calendars.
     */
    @GetMapping("/events/{shortId}/calendar-busy")
    public ResponseEntity<BusySlotsDto> getBusySlots(
            @PathVariable String shortId,
            @RequestParam List<String> calendarIds,
            @AuthenticationPrincipal Jwt jwt) {

        try {
            Long userId = JwtUtils.extractUserId(jwt);
            BusySlotsDto response = calendarService.getBusySlots(userId, shortId, calendarIds);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("[CalendarController] Failed to fetch busy slots", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/users/me/calendars")
    public ResponseEntity<Void> revokeCalendarAccess(@AuthenticationPrincipal Jwt jwt) {
        Long userId = JwtUtils.extractUserId(jwt);
        calendarService.revokeAccess(userId);
        return ResponseEntity.noContent().build();
    }
}