package com.recode.Dwaeji.alarm.database;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "alarm_send_log",
        comment = "알람 발송 중복 방지 로그",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_alarm_send_dedupe",
                columnNames = {"fk_user_idx", "alarm_type", "dedupe_key"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class AlarmSendLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "asl_idx", comment = "발송 로그 PK")
    private Long aslIdx;

    @Column(name = "fk_user_idx", nullable = false, comment = "사용자 PK")
    private Long userIdx;

    @Enumerated(EnumType.STRING)
    @Column(name = "alarm_type", length = 40, nullable = false, comment = "알람 유형")
    private AlarmType alarmType;

    @Column(name = "dedupe_key", length = 120, nullable = false, comment = "중복 방지 키")
    private String dedupeKey;

    @CreatedDate
    @Column(name = "sent_at", updatable = false)
    private LocalDateTime sentAt;
}
