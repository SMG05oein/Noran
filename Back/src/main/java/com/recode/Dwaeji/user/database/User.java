package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "User", comment = "사용자")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_idx", comment = "사용자 PK")
    private Long userIdx;

    @Column(name = "user_id", length = 50, unique = true, nullable = false, comment = "로그인 아이디")
    private String userId;

    @Column(name = "user_name", length = 50, nullable = false, comment = "사용자 이름")
    private String userName;

    @Column(name = "user_pw", length = 255, nullable = false, comment = "비밀번호")
    private String userPw;

    @Column(name = "user_email", length = 100, comment = "이메일")
    private String userEmail;

    @Column(name = "user_birth", comment = "생년월일")
    private LocalDate userBirth;

    @Column(name = "user_phone", length = 13, nullable = false, comment = "휴대폰 번호")
    private String userPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_ut_idx", nullable = false, comment = "사용자 유형 FK")
    private UserType userType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_work_place_idx", nullable = false, comment = "근무지 FK")
    private WorkPlace workPlace;

    @Column(name = "user_is_active", columnDefinition = "TINYINT", comment = "활성 여부")
    private Integer userIsActive;

    @Builder.Default
    @Column(name = "user_is_temp_pw", columnDefinition = "TINYINT", comment = "임시 비밀번호 여부")
    private Integer userIsTempPw = 0; // 0: 일반 비번, 1: 임시 비번 상태

    @Column(name = "user_temp_pw", length = 255, comment = "임시 비밀번호")
    private String userTempPw; // 임시 비번 (암호화 안 함)

    @Convert(converter = com.recode.Dwaeji.common.converter.CryptoConverter.class)
    @Column(name = "user_account_number", length = 255, comment = "계좌번호")
    private String userAccountNumber;

    @Column(name = "user_account_name", length = 50, comment = "예금주")
    private String userAccountName;

    @Column(name = "user_bank", length = 50, comment = "은행명")
    private String userBank;

    @Column(name = "user_hourly_wage", comment = "시급")
    private Integer userHourlyWage;

    @Builder.Default
    @Column(name = "bank_consent_agreed", nullable = false, columnDefinition = "TINYINT(1)", comment = "계좌 정보 동의 여부")
    private Boolean bankConsentAgreed = false;

    @Column(name = "bank_consent_date", comment = "계좌 정보 동의 일시")
    private LocalDateTime bankConsentDate;

    @Builder.Default
    @Column(name = "email_consent_agreed", nullable = false, columnDefinition = "TINYINT(1)", comment = "이메일 수신 동의 여부")
    private Boolean emailConsentAgreed = false;

    @Column(name = "email_consent_date", comment = "이메일 수신 동의 일시")
    private LocalDateTime emailConsentDate;

    @Builder.Default
    @Column(name = "privacy_consent_agreed", nullable = false)
    @ColumnDefault("false")
    private Boolean privacyConsentAgreed = false;

    @Column(name = "privacy_consent_date")
    private LocalDateTime privacyConsentDate;

    @Builder.Default
    @Column(name = "collection_consent_agreed", nullable = false)
    @ColumnDefault("false")
    private Boolean collectionConsentAgreed = false;

    @Column(name = "collection_consent_date")
    private LocalDateTime collectionConsentDate;

    @Builder.Default
    @Column(name = "terms_consent_agreed", nullable = false)
    @ColumnDefault("false")
    private Boolean termsConsentAgreed = false;

    @Column(name = "terms_consent_date")
    private LocalDateTime termsConsentDate;

    @Builder.Default
    @Column(name = "is_temp_user", nullable = false, columnDefinition = "TINYINT(1)", comment = "관리자 엑셀 업로드로 생성된 임시 유저 여부 (1: 임시, 0: 일반)")
    private Integer isTempUser = 0;

    @CreatedDate
    @Column(name = "user_created_at", nullable = false, updatable = false, comment = "생성 일시")
    private LocalDateTime userCreatedAt;

    @LastModifiedDate
    @Column(name = "user_updated_at", nullable = false, comment = "수정 일시")
    private LocalDateTime userUpdatedAt;

    @Column(name = "user_withdrawn_at", comment = "탈퇴 일시")
    private LocalDateTime userWithdrawnAt;

    @Column(name = "last_login_ip", length = 50, comment = "최근 로그인 IP")
    private String lastLoginIp;

    @Column(name = "last_login_date", comment = "최근 로그인 일시")
    private LocalDateTime lastLoginDate;

    public String getDisplayName() {
        if (this.userPhone != null && this.userPhone.length() >= 4) {
            return this.userName + "(" + this.userPhone.substring(this.userPhone.length() - 4) + ")";
        }
        return this.userName;
    }
}
