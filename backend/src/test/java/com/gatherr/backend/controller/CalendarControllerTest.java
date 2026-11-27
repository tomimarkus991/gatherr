package com.gatherr.backend.controller;

import com.gatherr.backend.service.CalendarOAuthState;
import com.gatherr.backend.service.GoogleCalendarService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CalendarControllerTest {

    private static final String CALLBACK = "/auth/google/calendar/callback";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GoogleCalendarService calendarService;

    @MockBean
    private CalendarOAuthState oauthState;

    @Test
    void callback_withoutBearerToken_storesTokensForTheUserInTheState() throws Exception {
        when(oauthState.verify("signed-state")).thenReturn(Optional.of(7L));

        mockMvc.perform(get(CALLBACK).param("code", "auth-code").param("state", "signed-state"))
                .andExpect(status().isFound())
                .andExpect(redirectedUrl("http://localhost:3000/calendar-connect?success=true"));

        verify(calendarService).handleCallback(7L, "auth-code");
    }

    @Test
    void callback_withInvalidState_redirectsWithErrorAndStoresNothing() throws Exception {
        when(oauthState.verify("forged")).thenReturn(Optional.empty());

        mockMvc.perform(get(CALLBACK).param("code", "auth-code").param("state", "forged"))
                .andExpect(status().isFound())
                .andExpect(redirectedUrl("http://localhost:3000/calendar-connect?error=invalid_state"));

        verify(calendarService, never()).handleCallback(anyLong(), anyString());
    }

    @Test
    void callback_whenUserDeniesConsent_redirectsWithAccessDenied() throws Exception {
        mockMvc.perform(get(CALLBACK).param("error", "access_denied").param("state", "signed-state"))
                .andExpect(status().isFound())
                .andExpect(redirectedUrl("http://localhost:3000/calendar-connect?error=access_denied"));

        verify(calendarService, never()).handleCallback(anyLong(), anyString());
    }

    @Test
    void initiate_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/auth/google/calendar"))
                .andExpect(status().isUnauthorized());
    }
}
