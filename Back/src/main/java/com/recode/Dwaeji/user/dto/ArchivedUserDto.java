package com.recode.Dwaeji.user.dto;

import com.recode.Dwaeji.user.database.ArchivedUser;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchivedUserDto {
    private Long originalUserIdx;
    private String userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private LocalDate userBirth;
    private String userAccountNumber;
    private String userAccountName;
    private String userBank;
    private LocalDateTime withdrawnAt;
    private LocalDateTime archivedAt;

    public static ArchivedUserDto fromEntity(ArchivedUser entity) {
        return ArchivedUserDto.builder()
                .originalUserIdx(entity.getOriginalUserIdx())
                .userId(entity.getUserId())
                .userName(entity.getUserName())
                .userEmail(entity.getUserEmail())
                .userPhone(entity.getUserPhone())
                .userBirth(entity.getUserBirth())
                .userAccountNumber(entity.getUserAccountNumber())
                .userAccountName(entity.getUserAccountName())
                .userBank(entity.getUserBank())
                .withdrawnAt(entity.getWithdrawnAt())
                .archivedAt(entity.getArchivedAt())
                .build();
    }
}
