package com.gatherr.backend.controller;

import com.gatherr.backend.dto.StatsDto;
import com.gatherr.backend.service.StatsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.aMapWithSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class StatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StatsService statsService;

    @Test
    void returns200_withoutAuthorizationHeader() throws Exception {
        when(statsService.getStats()).thenReturn(new StatsDto(0L));

        mockMvc.perform(get("/stats"))
                .andExpect(status().isOk());
    }

    @Test
    void returnsTotalEventsAsOnlyField() throws Exception {
        when(statsService.getStats()).thenReturn(new StatsDto(1234L));

        mockMvc.perform(get("/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", aMapWithSize(1)))
                .andExpect(jsonPath("$.totalEvents").value(1234));
    }
}
