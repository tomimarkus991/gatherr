package com.gatherr.backend.service;

import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.User;
import com.gatherr.backend.util.ConfirmedSlot;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class ConfirmationMailServiceTest {

    private static final ZoneId TALLINN = ZoneId.of("Europe/Tallinn");
    private static final Instant NOW = Instant.parse("2026-11-27T12:00:00Z");
    private static final String FROM = "Gatherr <noreply@gatherr.alber.ee>";

    @Mock
    private JavaMailSender mailSender;

    private User organiser;
    private User participant;
    private Event event;
    private ConfirmedSlot slot;

    @BeforeEach
    void setUp() {
        organiser = User.builder().id(1L).name("Olivia Organiser").email("olivia@example.com").build();
        participant = User.builder().id(2L).name("Pat Participant").email("pat@example.com").build();
        event = Event.builder()
                .id(10L)
                .name("Team lunch")
                .shortId("happy-blue-fox-123456")
                .creator(organiser)
                .timezone("Europe/Tallinn")
                .build();
        slot = new ConfirmedSlot(
                ZonedDateTime.of(2026, 3, 31, 9, 0, 0, 0, TALLINN),
                ZonedDateTime.of(2026, 3, 31, 9, 30, 0, 0, TALLINN),
                false);
    }

    private ConfirmationMailService serviceWithSender() {
        lenient().when(mailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
        return new ConfirmationMailService(Optional.of(mailSender), "smtp.example.com", FROM);
    }

    @Test
    void sendsOneEmailPerParticipant_withTitleTimeOrganiserAndIcsAttachment() throws Exception {
        ConfirmationMailService service = serviceWithSender();

        service.sendConfirmation(event, slot, List.of(organiser, participant), NOW);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(2)).send(captor.capture());
        List<MimeMessage> sent = captor.getAllValues();

        assertThat(((InternetAddress) sent.get(0).getAllRecipients()[0]).getAddress()).isEqualTo("olivia@example.com");
        assertThat(((InternetAddress) sent.get(1).getAllRecipients()[0]).getAddress()).isEqualTo("pat@example.com");

        MimeMessage message = sent.get(1);
        message.saveChanges();
        assertThat(((InternetAddress) message.getFrom()[0]).getAddress()).isEqualTo("noreply@gatherr.alber.ee");
        assertThat(message.getSubject()).contains("Team lunch");

        List<Part> parts = new ArrayList<>();
        collectParts(message, parts);

        Part body = partNamed(parts, null);
        String bodyText = (String) body.getContent();
        assertThat(bodyText)
                .contains("Team lunch")
                .contains("Tuesday, 31 March 2026, 09:00–09:30 (Europe/Tallinn)")
                .contains("Olivia Organiser");

        Part attachment = partNamed(parts, "invite.ics");
        assertThat(attachment.getContentType()).startsWith("text/calendar");
        String ics = readAll(attachment);
        assertThat(ics)
                .startsWith("BEGIN:VCALENDAR\r\n")
                .contains("\r\nDTSTART:20260331T060000Z\r\n")
                .contains("\r\nATTENDEE;CN=Pat Participant;ROLE=REQ-PARTICIPANT:mailto:pat@example.com\r\n");
    }

    @Test
    void allDayBody_saysAllDay() throws Exception {
        ConfirmationMailService service = serviceWithSender();
        ConfirmedSlot allDay = new ConfirmedSlot(
                ZonedDateTime.of(2026, 3, 31, 0, 0, 0, 0, TALLINN),
                ZonedDateTime.of(2026, 4, 1, 0, 0, 0, 0, TALLINN),
                true);

        service.sendConfirmation(event, allDay, List.of(participant), NOW);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage message = captor.getValue();
        message.saveChanges();
        List<Part> parts = new ArrayList<>();
        collectParts(message, parts);
        String bodyText = (String) partNamed(parts, null).getContent();
        assertThat(bodyText).contains("Tuesday, 31 March 2026, all day (Europe/Tallinn)");
    }

    @Test
    void multiDayAllDaySlot_isDescribedAsARange() {
        ConfirmedSlot slot = new ConfirmedSlot(
                ZonedDateTime.of(2026, 12, 1, 0, 0, 0, 0, ZoneId.of("Europe/Tallinn")),
                ZonedDateTime.of(2026, 12, 4, 0, 0, 0, 0, ZoneId.of("Europe/Tallinn")),
                true);

        assertThat(ConfirmationMailService.describeWhen(slot))
                .isEqualTo("Tuesday, 1 December 2026 – Thursday, 3 December 2026, all day (Europe/Tallinn)");
    }

    @Test
    void sendFailure_isLogged_doesNotThrow_andOtherRecipientsStillGetMail(CapturedOutput output) {
        ConfirmationMailService service = serviceWithSender();
        doThrow(new MailSendException("SMTP down"))
                .doNothing()
                .when(mailSender).send(any(MimeMessage.class));

        assertThatCode(() -> service.sendConfirmation(event, slot, List.of(organiser, participant), NOW))
                .doesNotThrowAnyException();

        verify(mailSender, times(2)).send(any(MimeMessage.class));
        assertThat(output).contains("Failed to send confirmation email").contains("happy-blue-fox-123456");
    }

    @Test
    void noMailSender_logsMailDisabled_andSkips(CapturedOutput output) {
        ConfirmationMailService service = new ConfirmationMailService(Optional.empty(), "", FROM);

        assertThatCode(() -> service.sendConfirmation(event, slot, List.of(participant), NOW))
                .doesNotThrowAnyException();

        assertThat(output).contains("Mail is disabled");
    }

    @Test
    void blankHost_logsMailDisabled_andSkips(CapturedOutput output) {
        ConfirmationMailService service = new ConfirmationMailService(Optional.of(mailSender), "  ", FROM);

        service.sendConfirmation(event, slot, List.of(participant), NOW);

        verifyNoInteractions(mailSender);
        assertThat(output).contains("Mail is disabled");
    }

    private static void collectParts(Part part, List<Part> out) throws Exception {
        Object content = part.getContent();
        if (content instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart child = multipart.getBodyPart(i);
                collectParts(child, out);
            }
        } else {
            out.add(part);
        }
    }

    private static Part partNamed(List<Part> parts, String fileName) throws Exception {
        for (Part part : parts) {
            if (java.util.Objects.equals(part.getFileName(), fileName)) {
                return part;
            }
        }
        throw new AssertionError("No part with file name " + fileName);
    }

    private static String readAll(Part part) throws Exception {
        try (InputStream in = part.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            in.transferTo(out);
            return out.toString(StandardCharsets.UTF_8);
        }
    }
}
