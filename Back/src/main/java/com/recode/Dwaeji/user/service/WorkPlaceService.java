package com.recode.Dwaeji.user.service;

import com.recode.Dwaeji.user.dto.WorkPlaceDto;
import com.recode.Dwaeji.user.dto.WorkPlaceRequestDto;

import java.util.List;

public interface WorkPlaceService {
    List<WorkPlaceDto> getAllWorkPlaces();

    WorkPlaceDto getWorkPlaceById(Long wpIdx);

    void createWorkPlace(String requesterId, WorkPlaceRequestDto requestDto);

    void updateWorkPlace(String requesterId, Long wpIdx, WorkPlaceRequestDto requestDto);

    void deleteWorkPlace(String requesterId, Long wpIdx);
}
