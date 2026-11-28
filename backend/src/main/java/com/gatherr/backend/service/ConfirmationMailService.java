package com.gatherr.backend.service;

import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.User;
import com.gatherr.backend.util.ConfirmedSlot;
import com.gatherr.backend.util.IcsBuilder;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Emails each participant the confirmed time with an .ics invite attached. A failed send
 * is logged per recipient and never thrown, so the confirmation itself still stands.
 * Without an SMTP host, sending is skipped and logged.
 */
@Service
public class ConfirmationMailService {

    private static final Logger log = LoggerFactory.getLogger(ConfirmationMailService.class);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEEE, d MMMM uuuu", Locale.ENGLISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH);
    private static final String ICS_FILE_NAME = "invite.ics";

    private final JavaMailSender mailSender;
    private final String mailHost;
    private final String from;

    public ConfirmationMailService(
            Optional<JavaMailSender> mailSender,
            @Value("${spring.mail.host:}") String mailHost,
            @Value("${app.mail.from:}") String from
    ) {
        this.mailSender = mailSender.orElse(null);
        this.mailHost = mailHost;
        this.from = from;
    }

    public void sendConfirmation(Event event, ConfirmedSlot slot, List<User> recipients, Instant dtstamp) {
        if (mailSender == null || mailHost == null || mailHost.isBlank()) {
            log.info("Mail is disabled (no SMTP host configured); skipping confirmation email for event {}",
                    event.getShortId());
            return;
        }

        String ics = IcsBuilder.build(event, slot, recipients, dtstamp);
        String subject = "Confirmed: " + event.getName();
        String when = describeWhen(slot);
        String organiserName = event.getCreator().getName();

        for (User recipient : recipients) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
                if (from != null && !from.isBlank()) {
                    helper.setFrom(from);
                }
                helper.setTo(recipient.getEmail());
                helper.setSubject(subject);
                helper.setText(body(recipient.getName(), event.getName(), when, organiserName));
                helper.addAttachment(ICS_FILE_NAME,
                        new ByteArrayResource(ics.getBytes(StandardCharsets.UTF_8)),
                        "text/calendar; charset=UTF-8; method=PUBLISH");
                mailSender.send(message);
            } catch (MessagingException | RuntimeException e) {
                log.error("Failed to send confirmation email for event {} to user {}",
                        event.getShortId(), recipient.getId(), e);
            }
        }
    }

    /**
     * For example "Tuesday, 31 March 2026, 09:00–09:30 (Europe/Tallinn)", or for a trip
     * "Tuesday, 1 December 2026 – Thursday, 3 December 2026, all day (Europe/Tallinn)".
     */
    static String describeWhen(ConfirmedSlot slot) {
        String zone = " (" + slot.start().getZone().getId() + ")";
        if (slot.allDay()) {
            LocalDate lastDay = slot.end().toLocalDate().minusDays(1);
            if (lastDay.isAfter(slot.start().toLocalDate())) {
                return DAY.format(slot.start()) + " – " + DAY.format(lastDay) + ", all day" + zone;
            }
            return DAY.format(slot.start()) + ", all day" + zone;
        }
        if (slot.start().toLocalDate().equals(slot.end().toLocalDate())) {
            return DAY.format(slot.start()) + ", " + TIME.format(slot.start()) + "–" + TIME.format(slot.end()) + zone;
        }
        return DAY.format(slot.start()) + ", " + TIME.format(slot.start())
                + " – " + DAY.format(slot.end()) + ", " + TIME.format(slot.end()) + zone;
    }

    private static String body(String recipientName, String eventName, String when, String organiserName) {
        return "Hi " + recipientName + ",\n\n"
                + organiserName + " has confirmed the time for \"" + eventName + "\".\n\n"
                + "Event: " + eventName + "\n"
                + "When: " + when + "\n"
                + "Organiser: " + organiserName + "\n\n"
                + "Open the attached " + ICS_FILE_NAME + " to add it to Google Calendar, Outlook or Apple Calendar.\n\n"
                + "Gatherr\n";
    }
}
