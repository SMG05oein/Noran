package com.recode.Dwaeji.user.service;

import com.recode.Dwaeji.user.dto.UserTypeDto;
import com.recode.Dwaeji.user.dto.UserTypeRequestDto;
import java.util.List;

public interface UserTypeService {
    UserTypeDto createUserType(UserTypeRequestDto requestDto);
    List<UserTypeDto> getAllUserTypes();
    UserTypeDto getUserType(Long utIdx);
    UserTypeDto updateUserType(Long utIdx, UserTypeRequestDto requestDto);
    void deleteUserType(Long utIdx);
}
