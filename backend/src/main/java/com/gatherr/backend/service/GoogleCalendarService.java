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
import com.google.api.services.calendar.model.FreeBusyCalendar;
import com.google.api.services.calendar.model.FreeBusyRequest;
import com.google.api.services.calendar.model.FreeBusyRequestItem;
import com.google.api.services.calendar.model.FreeBusyResponse;
import com.google.api.services.calendar.model.TimePeriod;

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

    /**
     * The narrowest scopes the import needs: the calendar list for the picker, and free/busy times.
     * Gatherr never sees event titles or details. calendar.events.freebusy covers every calendar the
     * user can access; calendar.freebusy ("your calendars") made Google answer notFound for calendars
     * picked from the list.
     */
    static final List<String> SCOPES = List.of(
            CalendarScopes.CALENDAR_CALENDARLIST_READONLY,
            CalendarScopes.CALENDAR_EVENTS_FREEBUSY);

    /** Google's freebusy query accepts at most 50 calendars. */
    static final int MAX_CALENDARS_PER_QUERY = 50;

    /** Keeps each freebusy query well inside the time range Google allows. */
    static final Duration MAX_QUERY_RANGE = Duration.ofDays(30);

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
     * Builds the Google consent-screen URL requesting {@link #SCOPES}.
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
     * Asks Google for the busy times of the selected calendars across the Gatherr event's slots,
     * then returns the slots that overlap any of them.
     *
     * Google's freebusy query already leaves out entries marked "Free" and invitations the user declined.
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
        if (slotWindows.isEmpty() || calendarIds.isEmpty()) return new BusySlotsDto(List.of());

        Instant rangeStart = slotWindows.values().stream().map(SlotWindows.Window::start).min(Instant::compareTo).orElseThrow();
        Instant rangeEnd = slotWindows.values().stream().map(SlotWindows.Window::end).max(Instant::compareTo).orElseThrow();

        Calendar service = buildCalendarService(userId);

        List<SlotWindows.Window> busyWindows = new ArrayList<>();
        for (int i = 0; i < calendarIds.size(); i += MAX_CALENDARS_PER_QUERY) {
            List<FreeBusyRequestItem> items = calendarIds
                    .subList(i, Math.min(i + MAX_CALENDARS_PER_QUERY, calendarIds.size()))
                    .stream()
                    .map(id -> new FreeBusyRequestItem().setId(id))
                    .toList();

            for (Instant from = rangeStart; from.isBefore(rangeEnd); from = from.plus(MAX_QUERY_RANGE)) {
                Instant to = from.plus(MAX_QUERY_RANGE).isBefore(rangeEnd) ? from.plus(MAX_QUERY_RANGE) : rangeEnd;
                FreeBusyResponse response = service.freebusy().query(new FreeBusyRequest()
                                .setTimeMin(new com.google.api.client.util.DateTime(from.toEpochMilli()))
                                .setTimeMax(new com.google.api.client.util.DateTime(to.toEpochMilli()))
                                .setItems(items))
                        .execute();
                busyWindows.addAll(busyWindows(response, userId));
            }
        }

        return new BusySlotsDto(overlappingSlots(slotWindows, busyWindows));
    }

    /**
     * Reads the busy periods out of a freebusy response. A calendar Google reports an error for
     * (for example one the user can no longer read) is skipped and logged, not fatal.
     */
    static List<SlotWindows.Window> busyWindows(FreeBusyResponse response, Long userId) {
        if (response.getCalendars() == null) return List.of();

        List<SlotWindows.Window> windows = new ArrayList<>();
        for (Map.Entry<String, FreeBusyCalendar> entry : response.getCalendars().entrySet()) {
            FreeBusyCalendar calendar = entry.getValue();
            if (calendar.getErrors() != null && !calendar.getErrors().isEmpty()) {
                log.warn("[GoogleCalendar] Skipping calendar {} for userId={}: {}", entry.getKey(), userId,
                        calendar.getErrors().get(0).getReason());
                continue;
            }
            if (calendar.getBusy() == null) continue;
            for (TimePeriod period : calendar.getBusy()) {
                if (period.getStart() == null || period.getEnd() == null) continue;
                windows.add(new SlotWindows.Window(
                        Instant.ofEpochMilli(period.getStart().getValue()),
                        Instant.ofEpochMilli(period.getEnd().getValue())));
            }
        }
        return windows;
    }

    /** The slots, in the event's order, that overlap at least one busy window. */
    static List<String> overlappingSlots(Map<String, SlotWindows.Window> slotWindows, List<SlotWindows.Window> busyWindows) {
        return slotWindows.entrySet().stream()
                .filter(entry -> busyWindows.stream().anyMatch(entry.getValue()::overlaps))
                .map(Map.Entry::getKey)
                .toList();
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

    private GoogleAuthorizationCodeFlow buildFlow() throws GeneralSecurityException, IOException {
        GoogleClientSecrets.Details details = new GoogleClientSecrets.Details()
                .setClientId(clientId)
                .setClientSecret(clientSecret);
        GoogleClientSecrets secrets = new GoogleClientSecrets().setInstalled(details);

        return new GoogleAuthorizationCodeFlow.Builder(
                new NetHttpTransport(),
                JSON_FACTORY,
                secrets,
                SCOPES
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