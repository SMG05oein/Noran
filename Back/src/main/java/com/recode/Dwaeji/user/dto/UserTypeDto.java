package com.recode.Dwaeji.user.dto;

import lombok.AllArgsConstructor;

import lombok.NoArgsConstructor;

import com.recode.Dwaeji.user.database.UserType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTypeDto {
    private Long utIdx;
    private String utName;
    private Integer utIsAdmin;
    private Integer utIsSuperAdmin;

    public static UserTypeDto fromEntity(UserType entity) {
        if (entity == null) return null;
        return UserTypeDto.builder()
                .utIdx(entity.getUtIdx())
                .utName(entity.getUtName())
                .utIsAdmin(entity.getUtIsAdmin())
                .utIsSuperAdmin(entity.getUtIsSuperAdmin())
                .build();
    }
}
