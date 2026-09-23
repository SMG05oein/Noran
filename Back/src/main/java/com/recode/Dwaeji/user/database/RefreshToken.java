package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(name = "Refresh_token")
@Comment("리프레시 토큰")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rf_idx")
    @Comment("리프레시 토큰 PK")
    private Long rfIdx;

    @Column(name = "rf_expiry_date", nullable = false)
    @Comment("만료 일시")
    private LocalDateTime rfExpiryDate;

    @Column(name = "rf_token", length = 512, nullable = false)
    @Comment("토큰 값")
    private String rfToken;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false)
    @Comment("사용자 FK")
    private User user;
}
