package com.recode.Dwaeji.user.dto;

import lombok.Builder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTypeRequestDto {

    @NotBlank(message = "직급명을 입력해주세요.")
    private String utName;

    @NotNull(message = "관리자 여부를 선택해주세요.")
    private Integer utIsAdmin;

    @NotNull(message = "최고 관리자 여부를 선택해주세요.")
    private Integer utIsSuperAdmin;

    private Integer utCanAccessArchive;
    private Integer utCanViewSensitive;
    private Integer utCanExportExcel;
    private Integer utCanManageRoles;
    private Integer utAllowMultiWorkplace;
    private Integer utCanManageSchedule;
}
