package com.recode.Dwaeji.user.service;

import com.recode.Dwaeji.user.dto.*;

public interface UserService {
    LoginResponseDto login(LoginRequestDto loginRequestDto);
    void signup(SignupRequestDto signupRequestDto);
    void adminRegisterUser(String requesterId, com.recode.Dwaeji.user.dto.AdminRegisterRequestDto dto);
    void updateUser(String requesterId, Long targetUserIdx, UserUpdateDto userUpdateDto);
    void bulkUpdateUsers(String requesterId, com.recode.Dwaeji.user.dto.UserBulkUpdateDto dto);
    void deleteUser(String requesterId, Long targetUserIdx);
    void withdrawUser(String requesterId);
    void hardDeleteUser(String requesterId, Long targetUserIdx);
    void restoreUser(String requesterId, Long targetUserIdx);
    void setLeaveStatus(String requesterId, Long targetUserIdx);
    void cancelLeave(String requesterId, Long targetUserIdx);
    UserInfoDto getUserInfo(String userId);
    UserInfoDto getUserInfoByIdx(String requesterId, Long targetUserIdx);
    com.recode.Dwaeji.user.dto.AccountDetailsDto getAccountDetails(String userId);
    com.recode.Dwaeji.user.dto.SensitiveInfoDto getSensitiveInfo(String requesterId, Long targetUserIdx);
    void updateSensitiveInfo(String requesterId, Long targetUserIdx, com.recode.Dwaeji.user.dto.SensitiveInfoDto dto);
    TokenRefreshResponseDto refreshAccessToken(String refreshToken);

    org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.UserInfoDto> searchWorkers(String requesterId, String userName, Long workPlaceIdx, int page, int size, Integer isActive, String sortBy, String sortDir);

    org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.UserInfoDto> getManagers(String requesterId, int page, int size, Integer isActive, String sortBy, String sortDir);

    org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.UserInfoDto> getAllEmployees(String requesterId, String userName, Long workPlaceIdx, int page, int size, Integer isActive, String sortBy, String sortDir);

    void setTempPassword(String requesterId, Long targetUserIdx, String tempPw);
    void changePassword(String requesterId, com.recode.Dwaeji.user.dto.ChangePasswordDto dto);
    void updateMyBankInfo(String requesterId, com.recode.Dwaeji.user.dto.BankInfoUpdateDto dto);
    java.util.List<com.recode.Dwaeji.user.dto.UserTypeDto> getAllUserTypes();

    /** 직원 엑셀 — 근무지별 Sheet (workPlaceIdx 있으면 해당 지점만) */
    byte[] downloadEmployeesExcel(String requesterId, Long workPlaceIdx);
    
    // 아카이빙 관련
    org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.ArchivedUserDto> getArchivedUsers(String requesterId, String reason, String ip, int page, int size);
    void restoreArchivedUser(String requesterId, Long originalUserIdx);
    void hardDeleteArchivedUser(String requesterId, Long originalUserIdx);
}
