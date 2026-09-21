package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "Archived_user")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchivedUser {

    @Id
    @Column(name = "original_user_idx")
    private Long originalUserIdx;

    @Column(name = "user_id", length = 50)
    private String userId;

    @Column(name = "user_name", length = 50)
    private String userName;

    @Column(name = "user_email", length = 100)
    private String userEmail;

    @Column(name = "user_phone", length = 13)
    private String userPhone;

    @Column(name = "user_birth")
    private LocalDate userBirth;

    @Convert(converter = com.recode.Dwaeji.common.converter.CryptoConverter.class)
    @Column(name = "user_account_number", length = 255)
    private String userAccountNumber;

    @Column(name = "user_account_name", length = 50)
    private String userAccountName;

    @Column(name = "user_bank", length = 50)
    private String userBank;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    @Column(name = "archived_at", nullable = false)
    private LocalDateTime archivedAt;

    @Column(name = "destroy_due_at", nullable = false)
    private LocalDateTime destroyDueAt;
}
