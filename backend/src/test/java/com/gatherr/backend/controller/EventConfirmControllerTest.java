package com.gatherr.backend.controller;

import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.EventUser;
import com.gatherr.backend.model.User;
import com.gatherr.backend.model.enums.EventType;
import com.gatherr.backend.repository.EventRepository;
import com.gatherr.backend.repository.EventUserRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
@TestPropertySource(properties = {
        "spring.mail.host=smtp.test",
        "app.mail.from=noreply@gatherr.test"
})
class EventConfirmControllerTest {

    private static final String SHORT_ID = "happy-blue-fox-123456";
    private static final String PATH = "/events/" + SHORT_ID + "/confirm";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EventRepository eventRepository;

    @MockBean
    private EventUserRepository eventUserRepository;

    @MockBean
    private JavaMailSender mailSender;

    private User organiser;
    private User participant;
    private Event event;

    @BeforeEach
    void setUp() {
        organiser = User.builder().id(1L).name("Olivia Organiser").email("olivia@example.com").build();
        participant = User.builder().id(2L).name("Pat Participant").email("pat@example.com").build();
        event = Event.builder()
                .id(10L)
                .name("Team lunch")
                .shortId(SHORT_ID)
                .creator(organiser)
                .type(EventType.SPECIFIC_DATES_AND_TIMES)
                .times(List.of("0900-31032026"))
                .timeIncrement(30)
                .timezone("Europe/Tallinn")
                .eventUsers(new ArrayList<>())
                .build();

        when(eventRepository.findByShortIdAndIsDeletedFalse(SHORT_ID)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));
        when(eventUserRepository.findByEventShortId(SHORT_ID)).thenReturn(List.of(
                EventUser.builder().event(event).user(organiser).available(List.of()).notAvailable(List.of()).build(),
                EventUser.builder().event(event).user(participant).available(List.of()).notAvailable(List.of()).build()
        ));
        when(mailSender.createMimeMessage()).thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
    }

    private static String body(String slot) {
        return "{\"slot\":\"" + slot + "\"}";
    }

    @Test
    void returns401_whenNoAuthorizationHeader() throws Exception {
        mockMvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(body("0900-31032026")))
                .andExpect(status().isUnauthorized());

        verify(eventRepository, never()).save(any());
    }

    @Test
    void organiserConfirms_returns200_storesConfirmation_andSendsMail() throws Exception {
        mockMvc.perform(post(PATH)
                        .with(jwt().jwt(b -> b.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("0900-31032026")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortId").value(SHORT_ID))
                .andExpect(jsonPath("$.confirmedStart").exists())
                .andExpect(jsonPath("$.confirmedEnd").exists())
                .andExpect(jsonPath("$.confirmedAt").exists());

        ArgumentCaptor<Event> saved = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository).save(saved.capture());
        assertThat(saved.getValue().getConfirmedStart()).isEqualTo(OffsetDateTime.parse("2026-03-31T09:00:00+03:00"));
        verify(mailSender, times(2)).send(any(MimeMessage.class));
    }

    @Test
    void sendFailure_stillStoresConfirmation_andReturns200(CapturedOutput output) throws Exception {
        doThrow(new MailSendException("SMTP down")).when(mailSender).send(any(MimeMessage.class));

        mockMvc.perform(post(PATH)
                        .with(jwt().jwt(b -> b.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("0900-31032026")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmedStart").exists());

        ArgumentCaptor<Event> saved = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository).save(saved.capture());
        assertThat(saved.getValue().getConfirmedStart()).isNotNull();
        assertThat(output).contains("Failed to send confirmation email");
    }

    @Test
    void nonOrganiser_returns403() throws Exception {
        mockMvc.perform(post(PATH)
                        .with(jwt().jwt(b -> b.subject("2")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("0900-31032026")))
                .andExpect(status().isForbidden());

        verify(eventRepository, never()).save(any());
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void unknownSlot_returns400() throws Exception {
        mockMvc.perform(post(PATH)
                        .with(jwt().jwt(b -> b.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("1200-31032026")))
                .andExpect(status().isBadRequest());

        verify(eventRepository, never()).save(any());
    }

    @Test
    void blankSlot_returns400() throws Exception {
        mockMvc.perform(post(PATH)
                        .with(jwt().jwt(b -> b.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("")))
                .andExpect(status().isBadRequest());

        verify(eventRepository, never()).save(any());
    }

    @Test
    void missingEvent_returns404() throws Exception {
        when(eventRepository.findByShortIdAndIsDeletedFalse("missing")).thenReturn(Optional.empty());

        mockMvc.perform(post("/events/missing/confirm")
                        .with(jwt().jwt(b -> b.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("0900-31032026")))
                .andExpect(status().isNotFound());
    }
}
