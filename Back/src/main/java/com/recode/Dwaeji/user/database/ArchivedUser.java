package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "Archived_user")
@Comment("탈퇴 사용자 아카이브")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchivedUser {

    @Id
    @Column(name = "original_user_idx")
    @Comment("원본 사용자 PK")
    private Long originalUserIdx;

    @Column(name = "user_id", length = 50)
    @Comment("로그인 아이디")
    private String userId;

    @Column(name = "user_name", length = 50)
    @Comment("사용자 이름")
    private String userName;

    @Column(name = "user_email", length = 100)
    @Comment("이메일")
    private String userEmail;

    @Column(name = "user_phone", length = 13)
    @Comment("휴대폰 번호")
    private String userPhone;

    @Column(name = "user_birth")
    @Comment("생년월일")
    private LocalDate userBirth;

    @Convert(converter = com.recode.Dwaeji.common.converter.CryptoConverter.class)
    @Column(name = "user_account_number", length = 255)
    @Comment("계좌번호")
    private String userAccountNumber;

    @Column(name = "user_account_name", length = 50)
    @Comment("예금주")
    private String userAccountName;

    @Column(name = "user_bank", length = 50)
    @Comment("은행명")
    private String userBank;

    @Column(name = "withdrawn_at")
    @Comment("탈퇴 일시")
    private LocalDateTime withdrawnAt;

    @Column(name = "archived_at", nullable = false)
    @Comment("아카이브 일시")
    private LocalDateTime archivedAt;

    @Column(name = "destroy_due_at", nullable = false)
    @Comment("파기 예정 일시")
    private LocalDateTime destroyDueAt;
}
