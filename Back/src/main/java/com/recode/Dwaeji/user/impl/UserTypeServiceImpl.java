package com.recode.Dwaeji.user.impl;

import com.recode.Dwaeji.user.database.UserType;
import com.recode.Dwaeji.user.dto.UserTypeDto;
import com.recode.Dwaeji.user.dto.UserTypeRequestDto;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.user.repository.UserTypeRepository;
import com.recode.Dwaeji.user.service.UserTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;
import com.recode.Dwaeji.user.database.User;

@Service
@RequiredArgsConstructor
public class UserTypeServiceImpl implements UserTypeService {

    private final UserTypeRepository userTypeRepository;
    private final UserRepository userRepository;

    private void checkManageRolePermission(String requesterId) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));

        UserType ut = requester.getUserType();
        if (ut == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "직급 정보가 없습니다.");
        }

        boolean isSuperAdmin = ut.getUtIsSuperAdmin() != null && ut.getUtIsSuperAdmin() == 1;
        boolean canManageRoles = ut.getUtCanManageRoles() != null && ut.getUtCanManageRoles() == 1;

        if (!isSuperAdmin && !canManageRoles) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "직급 및 권한을 관리할 권한이 없습니다.");
        }
    }

    @Override
    @Transactional
    public UserTypeDto createUserType(String requesterId, UserTypeRequestDto requestDto) {
        checkManageRolePermission(requesterId);

        UserType userType = UserType.builder()
                .utName(requestDto.getUtName())
                .utIsAdmin(requestDto.getUtIsAdmin())
                .utIsSuperAdmin(requestDto.getUtIsSuperAdmin())
                .utCanAccessArchive(requestDto.getUtCanAccessArchive() != null ? requestDto.getUtCanAccessArchive() : 0)
                .utCanViewSensitive(requestDto.getUtCanViewSensitive() != null ? requestDto.getUtCanViewSensitive() : 0)
                .utCanEditSensitive(requestDto.getUtCanEditSensitive() != null ? requestDto.getUtCanEditSensitive() : 0)
                .utCanExportExcel(requestDto.getUtCanExportExcel() != null ? requestDto.getUtCanExportExcel() : 0)
                .utCanManageRoles(requestDto.getUtCanManageRoles() != null ? requestDto.getUtCanManageRoles() : 0)
                .utAllowMultiWorkplace(requestDto.getUtAllowMultiWorkplace() != null ? requestDto.getUtAllowMultiWorkplace() : 0)
                .utCanManageSchedule(requestDto.getUtCanManageSchedule() != null ? requestDto.getUtCanManageSchedule() : 0)
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
    public UserTypeDto updateUserType(String requesterId, Long utIdx, UserTypeRequestDto requestDto) {
        checkManageRolePermission(requesterId);

        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));
        Long myUtIdx = requester.getUserType() != null ? requester.getUserType().getUtIdx() : null;
        if (java.util.Objects.equals(myUtIdx, utIdx)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본인 직급의 권한은 수정할 수 없습니다.");
        }

        UserType userType = userTypeRepository.findById(utIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 직급을 찾을 수 없습니다."));

        if (requestDto.getUtName() != null) userType.setUtName(requestDto.getUtName());
        if (requestDto.getUtIsAdmin() != null) userType.setUtIsAdmin(requestDto.getUtIsAdmin());
        if (requestDto.getUtIsSuperAdmin() != null) userType.setUtIsSuperAdmin(requestDto.getUtIsSuperAdmin());
        if (requestDto.getUtCanAccessArchive() != null)
            userType.setUtCanAccessArchive(requestDto.getUtCanAccessArchive());
        if (requestDto.getUtCanViewSensitive() != null)
            userType.setUtCanViewSensitive(requestDto.getUtCanViewSensitive());
        if (requestDto.getUtCanEditSensitive() != null)
            userType.setUtCanEditSensitive(requestDto.getUtCanEditSensitive());
        if (requestDto.getUtCanExportExcel() != null) userType.setUtCanExportExcel(requestDto.getUtCanExportExcel());
        if (requestDto.getUtCanManageRoles() != null) userType.setUtCanManageRoles(requestDto.getUtCanManageRoles());
        if (requestDto.getUtAllowMultiWorkplace() != null)
            userType.setUtAllowMultiWorkplace(requestDto.getUtAllowMultiWorkplace());
        if (requestDto.getUtCanManageSchedule() != null)
            userType.setUtCanManageSchedule(requestDto.getUtCanManageSchedule());

        return UserTypeDto.fromEntity(userType);
    }

    @Override
    @Transactional
    public void deleteUserType(String requesterId, Long utIdx) {
        checkManageRolePermission(requesterId);

        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));
        Long myUtIdx = requester.getUserType() != null ? requester.getUserType().getUtIdx() : null;
        if (java.util.Objects.equals(myUtIdx, utIdx)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본인 직급은 삭제할 수 없습니다.");
        }

        UserType userType = userTypeRepository.findById(utIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 직급을 찾을 수 없습니다."));
        userTypeRepository.delete(userType);
    }
}
