package com.gatherr.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.gatherr.backend.model.enums.EventRound;
import com.gatherr.backend.model.enums.EventType;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "events")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "short_id", unique = true, nullable = false)
    private String shortId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private User creator;

    @OneToMany(mappedBy = "event")
    private List<EventUser> eventUsers;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private com.gatherr.backend.model.enums.EventType type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<String> times;

    @Builder.Default
    @Column(name = "time_increment", nullable = false)
    private int timeIncrement = 30;

    @Column(nullable = false)
    private String timezone;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    @Column(name = "confirmed_start")
    private OffsetDateTime confirmedStart;

    @Column(name = "confirmed_end")
    private OffsetDateTime confirmedEnd;

    /** The date the organiser picked for the time round; null until the time round starts. */
    @Column(name = "time_round_date")
    private LocalDate timeRoundDate;

    /** The event's dates ({@code ddMMyyyy}) from the date round, kept read-only once the time round starts. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "date_times", columnDefinition = "jsonb")
    private List<String> dateTimes;

    /** Trip events: optional label and link per range key; null for other types (issue #148). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "range_details", columnDefinition = "jsonb")
    private Map<String, RangeDetail> rangeDetails;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    /** Derived from the stored state: TIME once a date is picked, DATE for a dates-only event, else none. */
    public EventRound getRound() {
        if (timeRoundDate != null) {
            return EventRound.TIME;
        }
        return type == EventType.SPECIFIC_DATES ? EventRound.DATE : null;
    }
}
