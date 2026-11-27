package com.gatherr.backend.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class CalendarOAuthStateTest {

    private static final String SECRET = "test-secret-that-is-at-least-256-bits-long-for-hmac-sha-256-algorithm";
    private static final Instant NOW = Instant.parse("2026-06-10T12:00:00Z");

    private CalendarOAuthState at(Instant instant) {
        return new CalendarOAuthState(SECRET, Clock.fixed(instant, ZoneOffset.UTC));
    }

    @Test
    void verifiesAStateItIssued() {
        String state = at(NOW).issue(42L);
        assertThat(at(NOW.plus(Duration.ofMinutes(9))).verify(state)).contains(42L);
    }

    @Test
    void rejectsAnExpiredState() {
        String state = at(NOW).issue(42L);
        assertThat(at(NOW.plus(Duration.ofMinutes(11))).verify(state)).isEmpty();
    }

    @Test
    void rejectsATamperedUserId() {
        String state = at(NOW).issue(42L);
        String forged = "43" + state.substring(state.indexOf('.'));
        assertThat(at(NOW).verify(forged)).isEmpty();
    }

    @Test
    void rejectsAStateSignedWithAnotherSecret() {
        String state = new CalendarOAuthState(SECRET + "x", Clock.fixed(NOW, ZoneOffset.UTC)).issue(42L);
        assertThat(at(NOW).verify(state)).isEmpty();
    }

    @Test
    void rejectsGarbage() {
        assertThat(at(NOW).verify(null)).isEmpty();
        assertThat(at(NOW).verify("")).isEmpty();
        assertThat(at(NOW).verify("a.b.c")).isEqualTo(Optional.empty());
        assertThat(at(NOW).verify("not-a-state")).isEmpty();
    }
}
