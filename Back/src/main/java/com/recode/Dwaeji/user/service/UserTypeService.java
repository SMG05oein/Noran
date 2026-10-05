package com.recode.Dwaeji.user.service;

import com.recode.Dwaeji.user.dto.UserTypeDto;
import com.recode.Dwaeji.user.dto.UserTypeRequestDto;

import java.util.List;

public interface UserTypeService {
    UserTypeDto createUserType(String requesterId, UserTypeRequestDto requestDto);

    List<UserTypeDto> getAllUserTypes();

    UserTypeDto getUserType(Long utIdx);

    UserTypeDto updateUserType(String requesterId, Long utIdx, UserTypeRequestDto requestDto);

    void deleteUserType(String requesterId, Long utIdx);
}
