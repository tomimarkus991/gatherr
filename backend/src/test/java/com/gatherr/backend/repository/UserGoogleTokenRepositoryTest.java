package com.gatherr.backend.repository;

import com.gatherr.backend.model.EncryptedStringConverter;
import com.gatherr.backend.model.User;
import com.gatherr.backend.model.UserGoogleToken;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@Import(EncryptedStringConverter.class)
class UserGoogleTokenRepositoryTest {

    private static final String ACCESS = "ya29.plain-access-token";
    private static final String REFRESH = "1//plain-refresh-token";

    @Autowired
    private UserGoogleTokenRepository tokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void tokens_areStoredAsCiphertext_andReadBackAsPlaintext() {
        User user = userRepository.save(User.builder().name("Ada").email("ada@example.com").timezone("UTC").build());
        tokenRepository.save(UserGoogleToken.builder()
                .user(user)
                .accessToken(ACCESS)
                .refreshToken(REFRESH)
                .expiresAt(OffsetDateTime.now().plusHours(1))
                .build());
        entityManager.flush();
        entityManager.clear();

        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT access_token, refresh_token FROM user_google_tokens WHERE user_id = ?", user.getId());
        assertThat((String) row.get("access_token")).isNotBlank().doesNotContain(ACCESS);
        assertThat((String) row.get("refresh_token")).isNotBlank().doesNotContain(REFRESH);

        UserGoogleToken loaded = tokenRepository.findByUserId(user.getId()).orElseThrow();
        assertThat(loaded.getAccessToken()).isEqualTo(ACCESS);
        assertThat(loaded.getRefreshToken()).isEqualTo(REFRESH);
    }
}
