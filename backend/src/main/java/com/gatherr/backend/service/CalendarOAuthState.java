package com.gatherr.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;

/**
 * The OAuth {@code state} for the Google Calendar consent flow. Google's redirect back to the
 * callback carries no bearer token, so the state names the user and proves we issued it:
 * {@code <userId>.<expiresAtEpochSecond>.<HMAC-SHA256 signature>}.
 * The key is derived from the JWT secret but differs from it, so a state can never pass as a login token.
 */
@Component
public class CalendarOAuthState {

    private static final Duration TTL = Duration.ofMinutes(10);
    private static final String ALGORITHM = "HmacSHA256";

    private final SecretKeySpec key;
    private final Clock clock;

    @Autowired
    public CalendarOAuthState(@Value("${jwt.secret}") String secret) {
        this(secret, Clock.systemUTC());
    }

    CalendarOAuthState(String secret, Clock clock) {
        this.key = new SecretKeySpec((secret + ":calendar-oauth-state").getBytes(StandardCharsets.UTF_8), ALGORITHM);
        this.clock = clock;
    }

    public String issue(Long userId) {
        String payload = userId + "." + clock.instant().plus(TTL).getEpochSecond();
        return payload + "." + sign(payload);
    }

    public Optional<Long> verify(String state) {
        if (state == null) return Optional.empty();
        String[] parts = state.split("\\.");
        if (parts.length != 3) return Optional.empty();

        String payload = parts[0] + "." + parts[1];
        byte[] expected = sign(payload).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, parts[2].getBytes(StandardCharsets.UTF_8))) return Optional.empty();

        try {
            long expiresAt = Long.parseLong(parts[1]);
            if (clock.instant().getEpochSecond() > expiresAt) return Optional.empty();
            return Optional.of(Long.parseLong(parts[0]));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            byte[] signature = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 unavailable", e);
        }
    }
}
