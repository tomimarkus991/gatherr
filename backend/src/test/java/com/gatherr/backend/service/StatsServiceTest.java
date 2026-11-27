package com.gatherr.backend.service;

import com.gatherr.backend.dto.StatsDto;
import com.gatherr.backend.repository.EventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatsServiceTest {

    @Mock
    private EventRepository eventRepository;

    @InjectMocks
    private StatsService statsService;

    @Test
    void getStats_returnsCountOfAllEventsIncludingSoftDeleted() {
        // count() is the unfiltered JpaRepository count, so soft-deleted rows are included
        when(eventRepository.count()).thenReturn(42L);

        StatsDto stats = statsService.getStats();

        assertThat(stats.totalEvents()).isEqualTo(42L);
        verify(eventRepository).count();
        verifyNoMoreInteractions(eventRepository);
    }
}
