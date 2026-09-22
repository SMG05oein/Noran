package com.recode.Dwaeji.user.dto;

import com.recode.Dwaeji.user.database.UserType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
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
    private Integer utCanAccessArchive;
    private Integer utCanViewSensitive;
    private Integer utCanEditSensitive;
    private Integer utCanExportExcel;
    private Integer utCanManageRoles;
    private Integer utAllowMultiWorkplace;
    private Integer utCanManageSchedule;

    public static UserTypeDto fromEntity(UserType entity) {
        if (entity == null) return null;
        return UserTypeDto.builder()
                .utIdx(entity.getUtIdx())
                .utName(entity.getUtName())
                .utIsAdmin(entity.getUtIsAdmin())
                .utIsSuperAdmin(entity.getUtIsSuperAdmin())
                .utCanAccessArchive(entity.getUtCanAccessArchive())
                .utCanViewSensitive(entity.getUtCanViewSensitive())
                .utCanEditSensitive(entity.getUtCanEditSensitive())
                .utCanExportExcel(entity.getUtCanExportExcel())
                .utCanManageRoles(entity.getUtCanManageRoles())
                .utAllowMultiWorkplace(entity.getUtAllowMultiWorkplace())
                .utCanManageSchedule(entity.getUtCanManageSchedule())
                .build();
    }
}
