package com.recode.Dwaeji.user.service;

import com.recode.Dwaeji.user.dto.*;
import org.springframework.data.domain.Page;

public interface UserService {
    LoginResponseDto login(LoginRequestDto loginRequestDto);

    void signup(SignupRequestDto signupRequestDto);

    void adminRegisterUser(String requesterId, AdminRegisterRequestDto dto);

    void updateUser(String requesterId, Long targetUserIdx, UserUpdateDto userUpdateDto);

    void bulkUpdateUsers(String requesterId, UserBulkUpdateDto dto);

    void deleteUser(String requesterId, Long targetUserIdx);

    void withdrawUser(String requesterId);

    void hardDeleteUser(String requesterId, Long targetUserIdx);

    void restoreUser(String requesterId, Long targetUserIdx);

    void setLeaveStatus(String requesterId, Long targetUserIdx);

    void cancelLeave(String requesterId, Long targetUserIdx);

    UserInfoDto getUserInfo(String userId);

    UserInfoDto getUserInfoByIdx(String requesterId, Long targetUserIdx);

    AccountDetailsDto getAccountDetails(String userId);

    SensitiveInfoDto getSensitiveInfo(String requesterId, Long targetUserIdx);

    void updateSensitiveInfo(String requesterId, Long targetUserIdx, SensitiveInfoDto dto);

    TokenRefreshResponseDto refreshAccessToken(String refreshToken);

    Page<UserInfoDto> searchWorkers(String requesterId, String userName, Long workPlaceIdx, int page, int size, Integer isActive, String sortBy, String sortDir);

    Page<UserInfoDto> getManagers(String requesterId, int page, int size, Integer isActive, String sortBy, String sortDir);

    Page<UserInfoDto> getAllEmployees(String requesterId, String userName, Long workPlaceIdx, int page, int size, Integer isActive, String sortBy, String sortDir);

    void setTempPassword(String requesterId, Long targetUserIdx, String tempPw);

    void changePassword(String requesterId, ChangePasswordDto dto);

    void updateMyBankInfo(String requesterId, BankInfoUpdateDto dto);

    java.util.List<UserTypeDto> getAllUserTypes();

    /**
     * 직원 엑셀 — 근무지별 Sheet (workPlaceIdx 있으면 해당 지점만)
     */
    byte[] downloadEmployeesExcel(String requesterId, Long workPlaceIdx);
}
