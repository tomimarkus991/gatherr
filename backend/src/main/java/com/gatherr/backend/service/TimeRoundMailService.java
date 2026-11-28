package com.gatherr.backend.service;

import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Tells date-round participants that the organiser picked a date and the time round has started,
 * with a link back to the event. Like {@link ConfirmationMailService}, a failed send is logged per
 * recipient and never thrown, and without an SMTP host sending is skipped and logged.
 */
@Service
public class TimeRoundMailService {

    private static final Logger log = LoggerFactory.getLogger(TimeRoundMailService.class);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEEE, d MMMM uuuu", Locale.ENGLISH);

    private final JavaMailSender mailSender;
    private final String mailHost;
    private final String from;
    private final String frontendUrl;

    public TimeRoundMailService(
            Optional<JavaMailSender> mailSender,
            @Value("${spring.mail.host:}") String mailHost,
            @Value("${app.mail.from:}") String from,
            @Value("${app.frontend.url}") String frontendUrl
    ) {
        this.mailSender = mailSender.orElse(null);
        this.mailHost = mailHost;
        this.from = from;
        this.frontendUrl = frontendUrl;
    }

    public void sendTimeRoundStarted(Event event, LocalDate date, List<User> recipients) {
        if (mailSender == null || mailHost == null || mailHost.isBlank()) {
            log.info("Mail is disabled (no SMTP host configured); skipping time round email for event {}",
                    event.getShortId());
            return;
        }

        String subject = "Pick a time: " + event.getName();
        String link = frontendUrl.replaceAll("/+$", "") + "/e/" + event.getShortId();
        String organiserName = event.getCreator().getName();

        for (User recipient : recipients) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
                if (from != null && !from.isBlank()) {
                    helper.setFrom(from);
                }
                helper.setTo(recipient.getEmail());
                helper.setSubject(subject);
                helper.setText(body(recipient.getName(), event.getName(), DAY.format(date), organiserName, link));
                mailSender.send(message);
            } catch (MessagingException | RuntimeException e) {
                log.error("Failed to send time round email for event {} to user {}",
                        event.getShortId(), recipient.getId(), e);
            }
        }
    }

    private static String body(String recipientName, String eventName, String day, String organiserName, String link) {
        return "Hi " + recipientName + ",\n\n"
                + organiserName + " has picked the date for \"" + eventName + "\". Now pick the times you can make.\n\n"
                + "Event: " + eventName + "\n"
                + "Date: " + day + "\n"
                + "Mark your times: " + link + "\n\n"
                + "Gatherr\n";
    }
}
