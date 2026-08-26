package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "User")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_idx")
    private Long userIdx;

    @Column(name = "user_id", length = 50, unique = true, nullable = false)
    private String userId;

    @Column(name = "user_name", length = 50, nullable = false)
    private String userName;

    @Column(name = "user_pw", length = 255, nullable = false)
    private String userPw;

    @Column(name = "user_email", length = 100)
    private String userEmail;

    @Column(name = "user_birth")
    private LocalDate userBirth;

    @Column(name = "user_phone", length = 13, nullable = false)
    private String userPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_ut_idx", nullable = false)
    private UserType userType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_work_place_idx", nullable = false)
    private WorkPlace workPlace;

    @Column(name = "user_is_active", columnDefinition = "TINYINT")
    private Integer userIsActive;

    @Builder.Default
    @Column(name = "user_is_temp_pw", columnDefinition = "TINYINT")
    private Integer userIsTempPw = 0; // 0: 일반 비번, 1: 임시 비번 상태

    @Column(name = "user_temp_pw", length = 255)
    private String userTempPw; // 임시 비번 (암호화 안 함)

    @Convert(converter = com.recode.Dwaeji.common.converter.CryptoConverter.class)
    @Column(name = "user_account_number", length = 255)
    private String userAccountNumber;

    @Column(name = "user_account_name", length = 50)
    private String userAccountName;

    @Column(name = "user_bank", length = 50)
    private String userBank;

    @Column(name = "user_hourly_wage")
    private Integer userHourlyWage;

    @Builder.Default
    @Column(name = "bank_consent_agreed", nullable = false, columnDefinition = "TINYINT(1)")
    private Boolean bankConsentAgreed = false;

    @Column(name = "bank_consent_date")
    private LocalDateTime bankConsentDate;

    @CreatedDate
    @Column(name = "user_created_at", nullable = false, updatable = false)
    private LocalDateTime userCreatedAt;

    @LastModifiedDate
    @Column(name = "user_updated_at", nullable = false)
    private LocalDateTime userUpdatedAt;
}
