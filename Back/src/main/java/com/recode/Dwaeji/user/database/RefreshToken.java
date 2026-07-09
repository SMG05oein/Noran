package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Refresh_token")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rf_idx")
    private Long rfIdx;

    @Column(name = "rf_expiry_date", nullable = false)
    private LocalDateTime rfExpiryDate;

    @Column(name = "rf_token", length = 512, nullable = false)
    private String rfToken;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_user_idx", nullable = false)
    private User user;
}
