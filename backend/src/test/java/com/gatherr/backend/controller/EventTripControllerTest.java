package com.gatherr.backend.controller;

import com.gatherr.backend.model.Event;
import com.gatherr.backend.model.RangeDetail;
import com.gatherr.backend.model.User;
import com.gatherr.backend.repository.EventRepository;
import com.gatherr.backend.repository.EventUserRepository;
import com.gatherr.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /events for a trip (issue #148): ranges and their label and link go in and come back out. */
@SpringBootTest
@AutoConfigureMockMvc
class EventTripControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EventRepository eventRepository;
    @MockBean
    private EventUserRepository eventUserRepository;
    @MockBean
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        User organiser = User.builder().id(1L).name("Olivia").email("olivia@example.com").build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(organiser));
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static String body(String link) {
        return """
                {"name":"Rome","type":"DATE_RANGES","timezone":"Europe/Tallinn","timeIncrement":30,
                 "times":["01122026-03122026","14122026-18122026","23122026-26122026"],
                 "rangeDetails":{"01122026-03122026":{"label":"Rome, Ryanair €89","link":"%s"}}}
                """.formatted(link);
    }

    @Test
    void createTrip_returns201_withRangeDetails() throws Exception {
        mockMvc.perform(post("/events")
                        .with(jwt().jwt(b -> b.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("https://example.com/rome")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("DATE_RANGES"))
                .andExpect(jsonPath("$.times.length()").value(3))
                .andExpect(jsonPath("$.rangeDetails['01122026-03122026'].label").value("Rome, Ryanair €89"))
                .andExpect(jsonPath("$.rangeDetails['01122026-03122026'].link").value("https://example.com/rome"));

        ArgumentCaptor<Event> saved = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository).save(saved.capture());
        assertThat(saved.getValue().getRangeDetails()).isEqualTo(Map.of("01122026-03122026",
                new RangeDetail("Rome, Ryanair €89", "https://example.com/rome")));
    }

    @Test
    void createTrip_withNonHttpLink_returns400() throws Exception {
        mockMvc.perform(post("/events")
                        .with(jwt().jwt(b -> b.subject("1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("javascript:alert(1)")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Link must be an http or https URL"));

        verify(eventRepository, never()).save(any());
    }
}
