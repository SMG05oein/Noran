package com.recode.Dwaeji.user.service;

import com.recode.Dwaeji.user.dto.LoginRequestDto;
import com.recode.Dwaeji.user.dto.LoginResponseDto;

import com.recode.Dwaeji.user.dto.SignupRequestDto;

import com.recode.Dwaeji.user.dto.UserInfoDto;
import com.recode.Dwaeji.user.dto.UserInfoDto;
import com.recode.Dwaeji.user.dto.UserUpdateDto;
import com.recode.Dwaeji.user.dto.TokenRefreshResponseDto;

public interface UserService {
    LoginResponseDto login(LoginRequestDto loginRequestDto);
    void signup(SignupRequestDto signupRequestDto);
    void adminRegisterUser(String requesterId, com.recode.Dwaeji.user.dto.AdminRegisterRequestDto dto);
    void updateUser(String requesterId, Long targetUserIdx, UserUpdateDto userUpdateDto);
    void deleteUser(String requesterId, Long targetUserIdx);
    void withdrawUser(String requesterId);
    void hardDeleteUser(String requesterId, Long targetUserIdx);
    void restoreUser(String requesterId, Long targetUserIdx);
    UserInfoDto getUserInfo(String userId);
    UserInfoDto getUserInfoByIdx(String requesterId, Long targetUserIdx);
    com.recode.Dwaeji.user.dto.AccountDetailsDto getAccountDetails(String userId);
    com.recode.Dwaeji.user.dto.SensitiveInfoDto getSensitiveInfo(String requesterId, Long targetUserIdx);
    void updateSensitiveInfo(String requesterId, Long targetUserIdx, com.recode.Dwaeji.user.dto.SensitiveInfoDto dto);
    TokenRefreshResponseDto refreshAccessToken(String refreshToken);

    org.springframework.data.domain.Page<UserInfoDto> searchWorkers(String requesterId, String userName, Long workPlaceIdx, int page, int size, Integer isActive);
    org.springframework.data.domain.Page<UserInfoDto> getManagers(String requesterId, int page, int size, Integer isActive);

    void setTempPassword(String requesterId, Long targetUserIdx, String tempPw);
    void changePassword(String requesterId, com.recode.Dwaeji.user.dto.ChangePasswordDto dto);
    void updateMyBankInfo(String requesterId, com.recode.Dwaeji.user.dto.BankInfoUpdateDto dto);
    java.util.List<com.recode.Dwaeji.user.dto.UserTypeDto> getAllUserTypes();
}
