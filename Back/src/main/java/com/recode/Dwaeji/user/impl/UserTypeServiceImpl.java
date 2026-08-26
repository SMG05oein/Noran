package com.recode.Dwaeji.user.impl;

import com.recode.Dwaeji.user.database.UserType;
import com.recode.Dwaeji.user.dto.UserTypeDto;
import com.recode.Dwaeji.user.dto.UserTypeRequestDto;
import com.recode.Dwaeji.user.repository.UserTypeRepository;
import com.recode.Dwaeji.user.service.UserTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserTypeServiceImpl implements UserTypeService {

    private final UserTypeRepository userTypeRepository;

    @Override
    @Transactional
    public UserTypeDto createUserType(UserTypeRequestDto requestDto) {
        UserType userType = UserType.builder()
                .utName(requestDto.getUtName())
                .utIsAdmin(requestDto.getUtIsAdmin())
                .utIsSuperAdmin(requestDto.getUtIsSuperAdmin())
                .build();
        UserType saved = userTypeRepository.save(userType);
        return UserTypeDto.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserTypeDto> getAllUserTypes() {
        return userTypeRepository.findAll().stream()
                .map(UserTypeDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserTypeDto getUserType(Long utIdx) {
        UserType userType = userTypeRepository.findById(utIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 직급을 찾을 수 없습니다."));
        return UserTypeDto.fromEntity(userType);
    }

    @Override
    @Transactional
    public UserTypeDto updateUserType(Long utIdx, UserTypeRequestDto requestDto) {
        UserType userType = userTypeRepository.findById(utIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 직급을 찾을 수 없습니다."));
        
        userType.setUtName(requestDto.getUtName());
        userType.setUtIsAdmin(requestDto.getUtIsAdmin());
        userType.setUtIsSuperAdmin(requestDto.getUtIsSuperAdmin());
        
        return UserTypeDto.fromEntity(userType);
    }

    @Override
    @Transactional
    public void deleteUserType(Long utIdx) {
        UserType userType = userTypeRepository.findById(utIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 직급을 찾을 수 없습니다."));
        userTypeRepository.delete(userType);
    }
}
