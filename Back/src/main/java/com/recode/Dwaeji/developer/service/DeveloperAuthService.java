package com.recode.Dwaeji.developer.service;

import com.recode.Dwaeji.JwtUtil;
import com.recode.Dwaeji.developer.database.Developer;
import com.recode.Dwaeji.developer.database.DeveloperRepository;
import com.recode.Dwaeji.developer.dto.DevLoginRequestDto;
import com.recode.Dwaeji.developer.dto.DevLoginResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DeveloperAuthService {

    private final DeveloperRepository developerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public DevLoginResponseDto login(DevLoginRequestDto request) {
        String devId = request.getDevId();
        if (devId != null) {
            devId = devId.toLowerCase();
        }

        Developer developer = developerRepository.findByDevId(devId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "존재하지 않는 개발자 계정입니다."));

        if (developer.getDevIsActive() == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비활성화된 계정입니다.");
        }

        // 임시 비밀번호 로그인 처리
        if (developer.getDevIsTempPw() == 1) {
            if (!request.getDevPw().equals(developer.getDevTempPw())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다.");
            }
        } else {
            // 일반 암호화 비밀번호 체크
            if (!passwordEncoder.matches(request.getDevPw(), developer.getDevPw())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다.");
            }
        }

        // ROLE_DEVELOPER 토큰 생성 (authType은 "DEVELOPER"로 설정)
        String accessToken = jwtUtil.createAccessToken(developer.getDevId(), "ROLE_DEVELOPER", "DEVELOPER");

        return DevLoginResponseDto.builder()
                .accessToken(accessToken)
                .devId(developer.getDevId())
                .devName(developer.getDevName())
                .isTempPw(developer.getDevIsTempPw())
                .build();
    }

    public void changePassword(String devId, com.recode.Dwaeji.developer.dto.DevChangePwRequestDto request) {
        Developer developer = developerRepository.findByDevId(devId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "개발자 계정을 찾을 수 없습니다."));

        // 기존 비밀번호 확인 (임시 비번일 경우와 아닐 경우)
        if (developer.getDevIsTempPw() == 1) {
            if (!request.getOldPw().equals(developer.getDevTempPw())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "기존 비밀번호가 일치하지 않습니다.");
            }
        } else {
            if (!passwordEncoder.matches(request.getOldPw(), developer.getDevPw())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "기존 비밀번호가 일치하지 않습니다.");
            }
        }

        // 새 비밀번호 암호화 및 저장
        developer.setDevPw(passwordEncoder.encode(request.getNewPw()));
        
        // 임시 비밀번호 관련 설정 초기화
        developer.setDevIsTempPw(0);
        developer.setDevTempPw(null);

        developerRepository.save(developer);
    }
}
