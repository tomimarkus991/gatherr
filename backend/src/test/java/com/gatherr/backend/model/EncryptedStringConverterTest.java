package com.gatherr.backend.model;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EncryptedStringConverterTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);
    private static final String TOKEN = "ya29.a0AfH6SMBexample-access-token";

    private final EncryptedStringConverter converter = new EncryptedStringConverter(KEY);

    @Test
    void roundTrip_returnsTheOriginalValue() {
        String stored = converter.convertToDatabaseColumn(TOKEN);

        assertThat(converter.convertToEntityAttribute(stored)).isEqualTo(TOKEN);
    }

    @Test
    void storedValue_differsFromThePlaintext() {
        String stored = converter.convertToDatabaseColumn(TOKEN);

        assertThat(stored).isNotEqualTo(TOKEN).doesNotContain(TOKEN);
    }

    @Test
    void encryptingTheSameValueTwice_givesDifferentCiphertexts() {
        assertThat(converter.convertToDatabaseColumn(TOKEN))
                .isNotEqualTo(converter.convertToDatabaseColumn(TOKEN));
    }

    @Test
    void storedValue_isBase64OfIvCiphertextAndTag() {
        byte[] raw = Base64.getDecoder().decode(converter.convertToDatabaseColumn(TOKEN));

        assertThat(raw).hasSize(12 + TOKEN.length() + 16);
    }

    @Test
    void null_staysNull() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void decryptingWithAnotherKey_fails() {
        String stored = converter.convertToDatabaseColumn(TOKEN);
        byte[] otherKey = new byte[32];
        otherKey[0] = 1;
        EncryptedStringConverter other = new EncryptedStringConverter(Base64.getEncoder().encodeToString(otherKey));

        assertThatThrownBy(() -> other.convertToEntityAttribute(stored)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void missingKey_refusesToStart() {
        assertThatThrownBy(() -> new EncryptedStringConverter(""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("TOKEN_ENCRYPTION_KEY");
    }

    @Test
    void keyOfWrongLength_refusesToStart() {
        String shortKey = Base64.getEncoder().encodeToString(new byte[16]);

        assertThatThrownBy(() -> new EncryptedStringConverter(shortKey))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }
}
