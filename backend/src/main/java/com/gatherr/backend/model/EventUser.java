package com.gatherr.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;

@Entity
@Table(name = "event_user",
        uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "user_id"}))
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<String> available;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "not_available", columnDefinition = "jsonb", nullable = false)
    private List<String> notAvailable;

    /** Date-round answers, copied here when the time round starts; never changed after that. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "date_available", columnDefinition = "jsonb")
    private List<String> dateAvailable;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "date_not_available", columnDefinition = "jsonb")
    private List<String> dateNotAvailable;

    @Column(name = "timezone")
    private String timezone;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}