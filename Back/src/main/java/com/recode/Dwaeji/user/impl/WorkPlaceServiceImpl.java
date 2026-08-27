package com.recode.Dwaeji.user.impl;

import com.recode.Dwaeji.user.database.WorkPlace;
import com.recode.Dwaeji.user.dto.WorkPlaceDto;
import com.recode.Dwaeji.user.repository.WorkPlaceRepository;
import com.recode.Dwaeji.user.service.WorkPlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recode.Dwaeji.user.dto.WorkPlaceRequestDto;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkPlaceServiceImpl implements WorkPlaceService {

    private final WorkPlaceRepository workPlaceRepository;
    private final UserRepository userRepository;

    private boolean isAdmin(String requesterId) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        return (reqIsAdmin != null && reqIsAdmin == 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkPlaceDto> getAllWorkPlaces() {
        return workPlaceRepository.findAll().stream()
                .map(WorkPlaceDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public WorkPlaceDto getWorkPlaceById(Long wpIdx) {
        WorkPlace wp = workPlaceRepository.findById(wpIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "근무지를 찾을 수 없습니다."));
        return WorkPlaceDto.fromEntity(wp);
    }

    @Override
    @Transactional
    public void createWorkPlace(String requesterId, WorkPlaceRequestDto requestDto) {
        if (!isAdmin(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 근무지를 생성할 수 있습니다.");
        }
        WorkPlace wp = WorkPlace.builder()
                .wpName(requestDto.getWpName())
                .wpAddress(requestDto.getWpAddress())
                .wpAddressDetails(requestDto.getWpAddressDetails())
                .build();
        workPlaceRepository.save(wp);
    }

    @Override
    @Transactional
    public void updateWorkPlace(String requesterId, Long wpIdx, WorkPlaceRequestDto requestDto) {
        if (!isAdmin(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 근무지를 수정할 수 있습니다.");
        }
        WorkPlace wp = workPlaceRepository.findById(wpIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "근무지를 찾을 수 없습니다."));
        
        if (requestDto.getWpName() != null) wp.setWpName(requestDto.getWpName());
        if (requestDto.getWpAddress() != null) wp.setWpAddress(requestDto.getWpAddress());
        if (requestDto.getWpAddressDetails() != null) wp.setWpAddressDetails(requestDto.getWpAddressDetails());
    }

    @Override
    @Transactional
    public void deleteWorkPlace(String requesterId, Long wpIdx) {
        if (!isAdmin(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 근무지를 삭제할 수 있습니다.");
        }
        WorkPlace wp = workPlaceRepository.findById(wpIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "근무지를 찾을 수 없습니다."));
        
        workPlaceRepository.delete(wp);
    }
}
