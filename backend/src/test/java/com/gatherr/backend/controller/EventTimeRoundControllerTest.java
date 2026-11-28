package com.gatherr.backend.controller;

import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.EventUser;
import com.gatherr.backend.model.User;
import com.gatherr.backend.model.enums.EventType;
import com.gatherr.backend.repository.EventRepository;
import com.gatherr.backend.repository.EventUserRepository;
import jakarta.mail.Address;
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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
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
class EventTimeRoundControllerTest {

    private static final String SHORT_ID = "happy-blue-fox-123456";
    private static final String PATH = "/events/" + SHORT_ID + "/time-round";
    private static final List<String> DATES = List.of("31032026", "01042026");

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EventRepository eventRepository;

    @MockBean
    private EventUserRepository eventUserRepository;

    @MockBean
    private JavaMailSender mailSender;

    private User organiser;
    private Event event;
    private EventUser organiserAnswer;
    private EventUser patAnswer;
    private EventUser kimAnswer;

    @BeforeEach
    void setUp() {
        organiser = User.builder().id(1L).name("Olivia Organiser").email("olivia@example.com").build();
        User pat = User.builder().id(2L).name("Pat Participant").email("pat@example.com").build();
        User kim = User.builder().id(3L).name("Kim Participant").email("kim@example.com").build();
        event = Event.builder()
                .id(10L)
                .name("Team lunch")
                .shortId(SHORT_ID)
                .creator(organiser)
                .type(EventType.SPECIFIC_DATES)
                .times(new ArrayList<>(DATES))
                .timeIncrement(30)
                .timezone("Europe/Tallinn")
                .eventUsers(new ArrayList<>())
                .build();
        organiserAnswer = answer(organiser, List.of("31032026"), List.of("01042026"));
        patAnswer = answer(pat, List.of("31032026", "01042026"), List.of());
        kimAnswer = answer(kim, List.of(), List.of("31032026", "01042026"));

        when(eventRepository.findByShortIdAndIsDeletedFalse(SHORT_ID)).thenReturn(Optional.of(event));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));
        when(eventUserRepository.findByEventShortId(SHORT_ID))
                .thenReturn(List.of(organiserAnswer, patAnswer, kimAnswer));
        when(mailSender.createMimeMessage()).thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
    }

    private EventUser answer(User user, List<String> available, List<String> notAvailable) {
        return EventUser.builder().event(event).user(user)
                .available(new ArrayList<>(available)).notAvailable(new ArrayList<>(notAvailable)).build();
    }

    private static String body(String date, String start, String end, Integer increment) {
        return "{\"date\":\"" + date + "\",\"startTime\":\"" + start + "\",\"endTime\":\"" + end
                + "\",\"timeIncrement\":" + increment + "}";
    }

    private org.springframework.test.web.servlet.ResultActions start(String subject, String body) throws Exception {
        return mockMvc.perform(post(PATH)
                .with(jwt().jwt(b -> b.subject(subject)))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    @Test
    void newDatesOnlyEvent_isInTheDateRound_andOtherTypesHaveNoRound() throws Exception {
        assertThat(event.getRound()).isEqualTo(com.gatherr.backend.model.enums.EventRound.DATE);
        event.setType(EventType.WEEKDAYS);
        assertThat(event.getRound()).isNull();
        event.setType(EventType.SPECIFIC_DATES_AND_TIMES);
        assertThat(event.getRound()).isNull();
    }

    @Test
    void organiserStarts_replacesTimes_keepsDateAnswers_andEmailsParticipants() throws Exception {
        start("1", body("31032026", "18:00", "19:00", 30))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.round").value("TIME"))
                .andExpect(jsonPath("$.timeRoundDate").value("2026-03-31"))
                .andExpect(jsonPath("$.type").value("SPECIFIC_DATES_AND_TIMES"))
                .andExpect(jsonPath("$.timeIncrement").value(30))
                .andExpect(jsonPath("$.times.length()").value(3))
                .andExpect(jsonPath("$.times[0]").value("1800-31032026"))
                .andExpect(jsonPath("$.times[2]").value("1900-31032026"))
                .andExpect(jsonPath("$.dateTimes[1]").value("01042026"));

        ArgumentCaptor<Event> saved = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository).save(saved.capture());
        assertThat(saved.getValue().getTimes()).containsExactly("1800-31032026", "1830-31032026", "1900-31032026");
        assertThat(saved.getValue().getDateTimes()).containsExactlyElementsOf(DATES);
        assertThat(saved.getValue().getTimeRoundDate()).isEqualTo(LocalDate.of(2026, 3, 31));
        assertThat(saved.getValue().getRound()).isEqualTo(com.gatherr.backend.model.enums.EventRound.TIME);

        verify(eventUserRepository).saveAll(anyIterable());
        assertThat(patAnswer.getDateAvailable()).containsExactly("31032026", "01042026");
        assertThat(kimAnswer.getDateNotAvailable()).containsExactly("31032026", "01042026");
        assertThat(organiserAnswer.getDateAvailable()).containsExactly("31032026");
        assertThat(patAnswer.getAvailable()).isEmpty();
        assertThat(patAnswer.getNotAvailable()).isEmpty();

        ArgumentCaptor<MimeMessage> mails = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(2)).send(mails.capture());
        List<String> to = mails.getAllValues().stream()
                .flatMap(mail -> {
                    try {
                        return Arrays.stream(mail.getAllRecipients()).map(Address::toString);
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                })
                .toList();
        assertThat(to).containsExactlyInAnyOrder("pat@example.com", "kim@example.com");
        MimeMessage first = mails.getAllValues().get(0);
        assertThat(first.getSubject()).contains("Team lunch");
        String text = (String) first.getContent();
        assertThat(text).contains("Team lunch").contains("Tuesday, 31 March 2026")
                .contains("http://localhost:3000/e/" + SHORT_ID);
    }

    @Test
    void mailFailure_isLogged_andTheTimeRoundStillStarts(CapturedOutput output) throws Exception {
        doThrow(new MailSendException("SMTP down")).when(mailSender).send(any(MimeMessage.class));

        start("1", body("31032026", "18:00", "19:00", 30))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.round").value("TIME"));

        verify(eventRepository).save(any(Event.class));
        assertThat(output).contains("Failed to send time round email");
    }

    @Test
    void nonOrganiser_returns403() throws Exception {
        start("2", body("31032026", "18:00", "19:00", 30)).andExpect(status().isForbidden());

        verify(eventRepository, never()).save(any());
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void returns401_whenNoAuthorizationHeader() throws Exception {
        mockMvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON)
                        .content(body("31032026", "18:00", "19:00", 30)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void alreadyInTheTimeRound_returns400() throws Exception {
        event.setTimeRoundDate(LocalDate.of(2026, 3, 31));
        event.setType(EventType.SPECIFIC_DATES_AND_TIMES);
        event.setTimes(new ArrayList<>(List.of("1800-31032026")));

        start("1", body("31032026", "18:00", "19:00", 30)).andExpect(status().isBadRequest());
        verify(eventRepository, never()).save(any());
    }

    @Test
    void eventWithTimes_returns400() throws Exception {
        event.setType(EventType.SPECIFIC_DATES_AND_TIMES);
        event.setTimes(new ArrayList<>(List.of("1800-31032026")));

        start("1", body("31032026", "18:00", "19:00", 30)).andExpect(status().isBadRequest());
        verify(eventRepository, never()).save(any());
    }

    @Test
    void dateNotOneOfTheEventsDates_returns400() throws Exception {
        start("1", body("02042026", "18:00", "19:00", 30)).andExpect(status().isBadRequest());
        verify(eventRepository, never()).save(any());
    }

    @Test
    void endNotAfterStart_returns400() throws Exception {
        start("1", body("31032026", "19:00", "18:00", 30)).andExpect(status().isBadRequest());
        start("1", body("31032026", "18:00", "18:00", 30)).andExpect(status().isBadRequest());
        verify(eventRepository, never()).save(any());
    }

    @Test
    void malformedTime_returns400() throws Exception {
        start("1", body("31032026", "25:00", "26:00", 30)).andExpect(status().isBadRequest());
        start("1", body("31032026", "6pm", "7pm", 30)).andExpect(status().isBadRequest());
        verify(eventRepository, never()).save(any());
    }

    @Test
    void unsupportedIncrement_returns400() throws Exception {
        start("1", body("31032026", "18:00", "19:00", 7)).andExpect(status().isBadRequest());
        verify(eventRepository, never()).save(any());
    }

    @Test
    void missingEvent_returns404() throws Exception {
        when(eventRepository.findByShortIdAndIsDeletedFalse("missing")).thenReturn(Optional.empty());

        mockMvc.perform(post("/events/missing/time-round")
                        .with(jwt().jwt(b -> b.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("31032026", "18:00", "19:00", 30)))
                .andExpect(status().isNotFound());
    }
}
