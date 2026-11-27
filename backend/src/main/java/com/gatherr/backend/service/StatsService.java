package com.gatherr.backend.service;

import com.gatherr.backend.dto.StatsDto;
import com.gatherr.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final EventRepository eventRepository;

    /** Counts every event ever created, soft-deleted ones included. */
    @Transactional(readOnly = true)
    public StatsDto getStats() {
        return new StatsDto(eventRepository.count());
    }
}
