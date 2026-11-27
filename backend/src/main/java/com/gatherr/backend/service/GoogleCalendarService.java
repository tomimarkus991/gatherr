package com.gatherr.backend.service;

import com.gatherr.backend.dto.calendar.BusySlotsDto;
import com.gatherr.backend.dto.calendar.CalendarListDto;
import com.gatherr.backend.dto.calendar.CalendarSummaryDto;
import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.User;
import com.gatherr.backend.model.UserGoogleToken;
import com.gatherr.backend.repository.EventRepository;
import com.gatherr.backend.repository.UserGoogleTokenRepository;
import com.gatherr.backend.repository.UserRepository;
import com.gatherr.backend.util.SlotWindows;
import com.google.api.client.auth.oauth2.TokenResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.CalendarListEntry;
import com.google.api.services.calendar.model.Events;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleCalendarService {
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final String APPLICATION_NAME = "Gatherr";

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String clientSecret;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.base-url:http://localhost:8080/api/v1}")
    private String baseUrl;

    private final UserRepository userRepository;
    private final UserGoogleTokenRepository tokenRepository;
    private final EventRepository eventRepository;
    private final CalendarOAuthState oauthState;

    /**
     * Builds the Google consent-screen URL requesting calendar.readonly scope.
     * The frontend redirects the user to this URL. The signed state tells the callback who the user is,
     * because Google's redirect back carries no bearer token.
     */
    public String buildAuthorizationUrl(Long userId) throws GeneralSecurityException, IOException {
        return buildFlow()
                .newAuthorizationUrl()
                .setRedirectUri(baseUrl + "/auth/google/calendar/callback")
                .setAccessType("offline")   // request a refresh token
                .setApprovalPrompt("force") // force consent so refresh token is always returned
                .setState(oauthState.issue(userId))
                .build();
    }

    /**
     * Exchanges the authorization code for access + refresh tokens and persists them.
     * Called from the OAuth callback endpoint.
     */
    @Transactional
    public void handleCallback(Long userId, String code) throws GeneralSecurityException, IOException {
        TokenResponse response = buildFlow()
                .newTokenRequest(code)
                .setRedirectUri(baseUrl + "/auth/google/calendar/callback")
                .execute();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        UserGoogleToken token = tokenRepository.findByUserId(userId)
                .orElseGet(() -> UserGoogleToken.builder().user(user).build());

        token.setAccessToken(response.getAccessToken());
        if (response.getRefreshToken() != null) {
            token.setRefreshToken(response.getRefreshToken());
        }
        token.setExpiresAt(OffsetDateTime.now().plusSeconds(response.getExpiresInSeconds()));

        tokenRepository.save(token);
        log.info("[GoogleCalendar] Stored tokens for userId={}", userId);
    }

    @Transactional
    public void revokeAccess(Long userId) {
        tokenRepository.deleteByUserId(userId);
        log.info("[GoogleCalendar] Revoked calendar access for userId={}", userId);
    }

    public CalendarListDto listCalendars(Long userId) throws GeneralSecurityException, IOException {
        Calendar service = buildCalendarService(userId);
        List<CalendarListEntry> entries = service.calendarList().list()
                .setMinAccessRole("reader")
                .execute()
                .getItems();

        List<CalendarSummaryDto> summaries = entries == null ? List.of() : entries.stream()
                .map(e -> new CalendarSummaryDto(e.getId(), e.getSummary()))
                .toList();

        return new CalendarListDto(summaries);
    }

    /**
     * Fetches events from the selected calendars across the Gatherr event's slots,
     * then returns the slots that overlap any of them.
     *
     * Slots are read in the event's timezone and work for every event type: date-only and weekday
     * slots cover the whole day, weekday slots stand for their next occurrence (see {@link SlotWindows}).
     * Only slots from the event's own {@code times} list are returned.
     */
    public BusySlotsDto getBusySlots(Long userId, String shortId, List<String> calendarIds)
            throws GeneralSecurityException, IOException {

        Event event = eventRepository.findByShortId(shortId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + shortId));

        ZoneId zone = ZoneId.of(event.getTimezone());
        LocalDate today = LocalDate.now(zone);
        Map<String, SlotWindows.Window> slotWindows = new LinkedHashMap<>();
        for (String slot : event.getTimes()) {
            SlotWindows.of(slot, zone, event.getTimeIncrement(), today)
                    .ifPresent(window -> slotWindows.put(slot, window));
        }
        if (slotWindows.isEmpty()) return new BusySlotsDto(List.of());

        Instant rangeStart = slotWindows.values().stream().map(SlotWindows.Window::start).min(Instant::compareTo).orElseThrow();
        Instant rangeEnd = slotWindows.values().stream().map(SlotWindows.Window::end).max(Instant::compareTo).orElseThrow();

        Calendar service = buildCalendarService(userId);

        List<SlotWindows.Window> busyWindows = new ArrayList<>();
        for (String calendarId : calendarIds) {
            Events result = service.events().list(calendarId)
                    .setTimeMin(new com.google.api.client.util.DateTime(rangeStart.toEpochMilli()))
                    .setTimeMax(new com.google.api.client.util.DateTime(rangeEnd.toEpochMilli()))
                    .setSingleEvents(true)
                    .setOrderBy("startTime")
                    .execute();

            if (result.getItems() == null) continue;
            for (com.google.api.services.calendar.model.Event gcalEvent : result.getItems()) {
                SlotWindows.Window window = extractWindow(gcalEvent, zone);
                if (window != null) busyWindows.add(window);
            }
        }

        List<String> busySlots = slotWindows.entrySet().stream()
                .filter(entry -> busyWindows.stream().anyMatch(entry.getValue()::overlaps))
                .map(Map.Entry::getKey)
                .toList();

        return new BusySlotsDto(busySlots);
    }

    /**
     * Returns a valid access token for the user, refreshing it first if it has expired.
     */
    @Transactional
    public String getValidAccessToken(Long userId) throws IOException {
        UserGoogleToken token = tokenRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("No Google Calendar access for userId=" + userId));

        if (OffsetDateTime.now().isBefore(token.getExpiresAt().minusMinutes(1))) {
            return token.getAccessToken();
        }

        // Token expired — refresh it
        if (token.getRefreshToken() == null) {
            throw new IllegalStateException("Access token expired and no refresh token available for userId=" + userId);
        }

        TokenResponse refreshed = new GoogleRefreshTokenRequest(
                new NetHttpTransport(),
                JSON_FACTORY,
                token.getRefreshToken(),
                clientId,
                clientSecret
        ).execute();

        token.setAccessToken(refreshed.getAccessToken());
        token.setExpiresAt(OffsetDateTime.now().plusSeconds(refreshed.getExpiresInSeconds()));
        if (refreshed.getRefreshToken() != null) {
            token.setRefreshToken(refreshed.getRefreshToken());
        }
        tokenRepository.save(token);

        log.info("[GoogleCalendar] Refreshed access token for userId={}", userId);
        return token.getAccessToken();
    }

    /**
     * Extracts a start/end window from a Google Calendar event. All-day events carry only dates,
     * which are read as whole days in the Gatherr event's timezone.
     */
    private SlotWindows.Window extractWindow(com.google.api.services.calendar.model.Event gcalEvent, ZoneId zone) {
        com.google.api.services.calendar.model.EventDateTime start = gcalEvent.getStart();
        com.google.api.services.calendar.model.EventDateTime end   = gcalEvent.getEnd();
        if (start == null || end == null) return null;

        if (start.getDateTime() != null && end.getDateTime() != null) {
            return new SlotWindows.Window(
                    Instant.ofEpochMilli(start.getDateTime().getValue()),
                    Instant.ofEpochMilli(end.getDateTime().getValue()));
        }
        if (start.getDate() != null && end.getDate() != null) {
            return new SlotWindows.Window(
                    LocalDate.parse(start.getDate().toStringRfc3339()).atStartOfDay(zone).toInstant(),
                    LocalDate.parse(end.getDate().toStringRfc3339()).atStartOfDay(zone).toInstant());
        }
        return null;
    }

    private GoogleAuthorizationCodeFlow buildFlow() throws GeneralSecurityException, IOException {
        GoogleClientSecrets.Details details = new GoogleClientSecrets.Details()
                .setClientId(clientId)
                .setClientSecret(clientSecret);
        GoogleClientSecrets secrets = new GoogleClientSecrets().setInstalled(details);

        return new GoogleAuthorizationCodeFlow.Builder(
                new NetHttpTransport(),
                JSON_FACTORY,
                secrets,
                List.of(CalendarScopes.CALENDAR_READONLY)
        ).build();
    }

    private Calendar buildCalendarService(Long userId) throws GeneralSecurityException, IOException {
        String accessToken = getValidAccessToken(userId);
        com.google.api.client.auth.oauth2.Credential credential =
                new com.google.api.client.auth.oauth2.Credential(
                        com.google.api.client.auth.oauth2.BearerToken.authorizationHeaderAccessMethod()
                ).setAccessToken(accessToken);

        return new Calendar.Builder(
                new NetHttpTransport(),
                JSON_FACTORY,
                credential
        ).setApplicationName(APPLICATION_NAME).build();
    }

}