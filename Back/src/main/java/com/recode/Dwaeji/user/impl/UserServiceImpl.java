package com.recode.Dwaeji.user.impl;

import com.recode.Dwaeji.JwtUtil;
import com.recode.Dwaeji.user.database.RefreshToken;
import com.recode.Dwaeji.user.dto.SignupRequestDto;
import com.recode.Dwaeji.user.repository.RefreshTokenRepository;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.user.repository.UserTypeRepository;
import com.recode.Dwaeji.user.repository.WorkPlaceRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyWorkRepository;
import com.recode.Dwaeji.work_record.repository.WorkRecordRepository;
import com.recode.Dwaeji.user.dto.LoginRequestDto;
import com.recode.Dwaeji.user.dto.LoginResponseDto;
import com.recode.Dwaeji.user.dto.UserUpdateDto;
import com.recode.Dwaeji.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserTypeRepository userTypeRepository;
    private final WorkPlaceRepository workPlaceRepository;
    private final WorkApplyWorkRepository workApplyWorkRepository;
    private final WorkRecordRepository workRecordRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public LoginResponseDto login(LoginRequestDto loginRequestDto) {
        if (loginRequestDto.getUserId() != null) {
            loginRequestDto.setUserId(loginRequestDto.getUserId().toLowerCase());
        }

        // 아이디로 사용자 찾기
        User user = userRepository.findByUserId(loginRequestDto.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,"아이디 또는 비밀번호가 잘못되었습니다."));

        // 비밀번호 검증: 임시비번 상태면 plain text 비교, 일반이면 BCrypt 비교
        boolean isTempPw = user.getUserIsTempPw() != null && user.getUserIsTempPw() == 1;
        if (isTempPw) {
            if (!loginRequestDto.getUserPw().equals(user.getUserTempPw())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 잘못되었습니다.");
            }
        } else {
            if (!passwordEncoder.matches(loginRequestDto.getUserPw(), user.getUserPw())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 잘못되었습니다.");
            }
        }

        // 토큰 생성
        // UserType과 WorkPlace 정보를 엔티티 연관관계를 통해 가져옴
        String role = user.getUserType() != null ? user.getUserType().getUtName() : "알바생";
        String authType = user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : "노란돼지";

        String accessToken = jwtUtil.createAccessToken(user.getUserId(), role, authType);
        String refreshTokenStr = jwtUtil.createRefreshToken(user.getUserId());
        String msg = "성공적으로 로그인 되었습니다!";

        // Refresh 토큰 저장
        // 기존 Refresh 토큰이 있다면 삭제
        refreshTokenRepository.deleteByUser_UserIdx(user.getUserIdx());

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .rfToken(refreshTokenStr)
                .rfExpiryDate(LocalDateTime.now().plusDays(3))
                .build();
        refreshTokenRepository.save(refreshToken);

        return new LoginResponseDto(accessToken, refreshTokenStr, msg);
    }

    @Override
    @Transactional
    public void signup(SignupRequestDto signupRequestDto) {
        if (signupRequestDto.getUserId() != null) {
            signupRequestDto.setUserId(signupRequestDto.getUserId().toLowerCase());
        }



        if (signupRequestDto.getFkWorkPlaceIdx() == null || signupRequestDto.getFkWorkPlaceIdx() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 근무지입니다.");
        }

        if (signupRequestDto.getUserName() == null || signupRequestDto.getUserName().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이름을 입력해주세요.");
        }

        if (userRepository.findByUserId(signupRequestDto.getUserId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,"이미 사용하는 아이디입니다.");
        }

        // 연관 엔티티 조회
        // 강제로 근무 형태를 5로 고정
        com.recode.Dwaeji.user.database.UserType userType = userTypeRepository.findById(5L)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "기본 근무 형태(ID: 5)를 시스템에서 찾을 수 없습니다."));

        com.recode.Dwaeji.user.database.WorkPlace workPlace = workPlaceRepository.findById(signupRequestDto.getFkWorkPlaceIdx())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 근무지입니다."));

        User user = User.builder()
                .userId(signupRequestDto.getUserId())
                .userPw(passwordEncoder.encode(signupRequestDto.getUserPw()))
                .userName(signupRequestDto.getUserName())
                .userPhone(signupRequestDto.getUserPhone())
                .userType(userType)
                .workPlace(workPlace)
                .userIsActive(1) // 기본적으로 활성화 상태
                .build();

        userRepository.save(user);
    }

    @Override
    @Transactional
    public void updateUser(String requesterId, Long targetUserIdx, UserUpdateDto userUpdateDto) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        
        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 사용자를 찾을 수 없습니다."));

        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        boolean isAdmin = (reqIsAdmin != null && reqIsAdmin == 1);

        // 본인인 경우 통과, 본인이 아닌 경우 권한 체크
        if (!requester.getUserIdx().equals(targetUserIdx)) {
            // 관리자가 아니면 권한 없음
            if (!isAdmin) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "다른 사용자의 정보를 수정할 권한이 없습니다.");
            }
        }

        // 값 변경
        if (userUpdateDto.getUserName() != null && !userUpdateDto.getUserName().isEmpty()) {
            targetUser.setUserName(userUpdateDto.getUserName());
        }
        if (userUpdateDto.getUserPhone() != null && !userUpdateDto.getUserPhone().isEmpty()) {
            targetUser.setUserPhone(userUpdateDto.getUserPhone());
        }
        if (userUpdateDto.getUserBirth() != null) {
            targetUser.setUserBirth(userUpdateDto.getUserBirth());
        }
        if (userUpdateDto.getFkUtIdx() != null) {
            if (!isAdmin) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "근무 형태를 변경할 권한이 없습니다.");
            }
            com.recode.Dwaeji.user.database.UserType userType = userTypeRepository.findById(userUpdateDto.getFkUtIdx())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 근무 형태입니다."));
            targetUser.setUserType(userType);
        }
        if (userUpdateDto.getFkWorkPlaceIdx() != null) {
            com.recode.Dwaeji.user.database.WorkPlace workPlace = workPlaceRepository.findById(userUpdateDto.getFkWorkPlaceIdx())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 근무지입니다."));
            targetUser.setWorkPlace(workPlace);
        }
        // 은행/계좌번호는 관리자만 이 API로 수정 가능 (일반 유저는 별도 /me/bank-info 사용)
        if (isAdmin) {
            if (userUpdateDto.getUserBank() != null) {
                targetUser.setUserBank(userUpdateDto.getUserBank());
            }
            if (userUpdateDto.getUserAccountNumber() != null) {
                targetUser.setUserAccountNumber(userUpdateDto.getUserAccountNumber());
            }
        }
        targetUser.setUserEmail(userUpdateDto.getUserEmail());
        userRepository.save(targetUser);
    }

    @Override
    @Transactional
    public void deleteUser(String requesterId, Long targetUserIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        
        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 사용자를 찾을 수 없습니다."));

        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        boolean isAdmin = (reqIsAdmin != null && reqIsAdmin == 1);

        // 본인은 삭제 불가능
        if (requester.getUserIdx().equals(targetUserIdx)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자신의 계정은 직접 비활성화할 수 없습니다.");
        }

        // 관리자가 아니면 삭제 불가능
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "사용자를 비활성화할 권한이 없습니다.");
        }

        // 논리적 삭제
        targetUser.setUserIsActive(0);
    }

    @Override
    @Transactional
    public void hardDeleteUser(String requesterId, Long targetUserIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        
        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 사용자를 찾을 수 없습니다."));

        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        boolean isAdmin = (reqIsAdmin != null && reqIsAdmin == 1);

        // 관리자가 아니면 삭제 불가능
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "사용자를 영구 삭제할 권한이 없습니다.");
        }
        
        // 본인 계정 물리 삭제 불가 (필요시 제거 가능)
        if (requester.getUserIdx().equals(targetUserIdx)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자신의 계정은 직접 영구 삭제할 수 없습니다.");
        }

        // 관련된 자식 데이터 삭제 (Foreign Key 제약 조건 우회)
        refreshTokenRepository.deleteByUser_UserIdx(targetUserIdx);
        workApplyWorkRepository.deleteByUser_UserIdx(targetUserIdx);
        workRecordRepository.deleteByUser_UserIdx(targetUserIdx);

        // 실제 사용자 물리 삭제
        userRepository.delete(targetUser);
    }

    @Override
    @Transactional
    public void restoreUser(String requesterId, Long targetUserIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        
        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "복구할 사용자를 찾을 수 없습니다."));

        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        boolean isAdmin = (reqIsAdmin != null && reqIsAdmin == 1);

        // 관리자가 아니면 복구 불가능
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "사용자를 복구할 권한이 없습니다.");
        }

        // 논리적 복구
        targetUser.setUserIsActive(1);
    }

    private String maskResidentNumber(String rrn) {
        if (rrn == null || rrn.length() < 8) return rrn;
        return rrn.substring(0, 8) + "*".repeat(Math.max(0, rrn.length() - 8));
    }

    private String maskAccountNumber(String account) {
        if (account == null || account.trim().isEmpty()) return null;
        return "기재";
    }

    @Override
    @Transactional(readOnly = true)
    public com.recode.Dwaeji.user.dto.UserInfoDto getUserInfo(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        Integer isAdmin = (user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1) ? 1 : null;

        return com.recode.Dwaeji.user.dto.UserInfoDto.builder()
                .userIdx(user.getUserIdx())
                .userId(user.getUserId())
                .userName(user.getUserName())
                .userEmail(user.getUserEmail())
                .userBirth(user.getUserBirth())
                .userPhone(user.getUserPhone())
                .userTypeName(user.getUserType() != null ? user.getUserType().getUtName() : null)
                .workPlaceName(user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null)
                .userIsActive(user.getUserIsActive())
                .isAdmin(isAdmin)
                .userAccountName(user.getUserAccountName())
                .userAccountNumber(maskAccountNumber(user.getUserAccountNumber()))
                .userBank(user.getUserBank())
                .userHourlyWage(user.getUserHourlyWage())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public com.recode.Dwaeji.user.dto.UserInfoDto getUserInfoByIdx(String requesterId, Long targetUserIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        boolean isAdmin = (reqIsAdmin != null && reqIsAdmin == 1);
        
        // 본인 조회이거나 관리자인 경우만 허용
        if (!isAdmin && !requester.getUserIdx().equals(targetUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 유저의 정보를 조회할 권한이 없습니다.");
        }

        User user = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당하는 사용자가 존재하지 않습니다."));

        Integer adminFlag = (user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1) ? 1 : null;

        return com.recode.Dwaeji.user.dto.UserInfoDto.builder()
                .userIdx(user.getUserIdx())
                .userId(user.getUserId())
                .userName(user.getUserName())
                .userEmail(user.getUserEmail())
                .userBirth(user.getUserBirth())
                .userPhone(user.getUserPhone())
                .userTypeName(user.getUserType() != null ? user.getUserType().getUtName() : null)
                .workPlaceName(user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null)
                .userIsActive(user.getUserIsActive())
                .isAdmin(adminFlag)
                .userAccountName(user.getUserAccountName())
                .userAccountNumber(maskAccountNumber(user.getUserAccountNumber()))
                .userBank(user.getUserBank())
                .userHourlyWage(user.getUserHourlyWage())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public com.recode.Dwaeji.user.dto.AccountDetailsDto getAccountDetails(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return com.recode.Dwaeji.user.dto.AccountDetailsDto.builder()
                .userBank(user.getUserBank())
                .userAccountName(user.getUserAccountName())
                .userAccountNumber(user.getUserAccountNumber()) // 원문 반환
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public com.recode.Dwaeji.user.dto.SensitiveInfoDto getSensitiveInfo(String requesterId, Long targetUserIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "민감 정보를 조회할 권한이 없습니다.");
        }

        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return com.recode.Dwaeji.user.dto.SensitiveInfoDto.builder()
                .userAccountName(targetUser.getUserAccountName())
                .userAccountNumber(targetUser.getUserAccountNumber())
                .userBank(targetUser.getUserBank())
                .userHourlyWage(targetUser.getUserHourlyWage())
                .build();
    }

    @Override
    @Transactional
    public void updateSensitiveInfo(String requesterId, Long targetUserIdx, com.recode.Dwaeji.user.dto.SensitiveInfoDto dto) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "민감 정보를 수정할 권한이 없습니다.");
        }

        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));


        if (dto.getUserAccountName() != null) {
            targetUser.setUserAccountName(dto.getUserAccountName());
        }
        if (dto.getUserAccountNumber() != null) {
            targetUser.setUserAccountNumber(dto.getUserAccountNumber());
        }
        if (dto.getUserBank() != null) {
            targetUser.setUserBank(dto.getUserBank());
        }
        if (dto.getUserHourlyWage() != null) {
            targetUser.setUserHourlyWage(dto.getUserHourlyWage());
        }
        userRepository.save(targetUser);
    }

    @Override
    @Transactional(readOnly = true)
    public com.recode.Dwaeji.user.dto.TokenRefreshResponseDto refreshAccessToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 없습니다.");
        }

        try {
            // 1. 토큰 검증 및 userId 추출 (만료되었거나 변조되었으면 Exception 발생)
            io.jsonwebtoken.Claims claims = jwtUtil.extractToken(refreshToken);
            String userId = claims.getSubject();

            // 2. DB에 존재하는 리프레시 토큰인지 확인
            RefreshToken storedToken = refreshTokenRepository.findByRfToken(refreshToken)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다."));

            // 3. User 정보 조회 및 권한/근무지 획득
            User user = storedToken.getUser();
            String role = user.getUserType() != null ? user.getUserType().getUtName() : "알바생";
            String authType = user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : "노란돼지";

            // 4. 새로운 액세스 토큰 생성
            String newAccessToken = jwtUtil.createAccessToken(user.getUserId(), role, authType);

            return new com.recode.Dwaeji.user.dto.TokenRefreshResponseDto(newAccessToken, "새로운 액세스 토큰이 발급되었습니다.");
            
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "리프레시 토큰 검증에 실패했습니다.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.UserInfoDto> searchWorkers(String requesterId, String userName, Long workPlaceIdx, int page, int size, boolean showInactive) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 직원 목록을 조회할 수 있습니다.");
        }

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page, size, org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Order.asc("userName"),
                        org.springframework.data.domain.Sort.Order.asc("userIdx")));

        org.springframework.data.domain.Page<User> users;
        boolean hasName = userName != null && !userName.trim().isEmpty();

        if (showInactive) {
            if (workPlaceIdx != null && hasName) {
                users = userRepository.findByUserType_UtIsAdminAndWorkPlace_WpIdxAndUserNameContaining(0, workPlaceIdx, userName, pageable);
            } else if (workPlaceIdx != null) {
                users = userRepository.findByUserType_UtIsAdminAndWorkPlace_WpIdx(0, workPlaceIdx, pageable);
            } else if (hasName) {
                users = userRepository.findByUserType_UtIsAdminAndUserNameContaining(0, userName, pageable);
            } else {
                users = userRepository.findByUserType_UtIsAdmin(0, pageable);
            }
        } else {
            if (workPlaceIdx != null && hasName) {
                users = userRepository.findByUserType_UtIsAdminAndUserIsActiveAndWorkPlace_WpIdxAndUserNameContaining(0, 1, workPlaceIdx, userName, pageable);
            } else if (workPlaceIdx != null) {
                users = userRepository.findByUserType_UtIsAdminAndUserIsActiveAndWorkPlace_WpIdx(0, 1, workPlaceIdx, pageable);
            } else if (hasName) {
                users = userRepository.findByUserType_UtIsAdminAndUserIsActiveAndUserNameContaining(0, 1, userName, pageable);
            } else {
                users = userRepository.findByUserType_UtIsAdminAndUserIsActive(0, 1, pageable);
            }
        }

        return users.map(user -> {
            Integer adminFlag = (user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1) ? 1 : null;
            return com.recode.Dwaeji.user.dto.UserInfoDto.builder()
                    .userIdx(user.getUserIdx())
                    .userId(user.getUserId())
                    .userName(user.getUserName())
                    .userEmail(user.getUserEmail())
                    .userBirth(user.getUserBirth())
                    .userPhone(user.getUserPhone())
                    .userTypeName(user.getUserType() != null ? user.getUserType().getUtName() : null)
                    .workPlaceName(user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null)
                    .userIsActive(user.getUserIsActive())
                    .isAdmin(adminFlag)
                    .userHourlyWage(user.getUserHourlyWage())
                    .userAccountName(user.getUserAccountName())
                    .userAccountNumber(maskAccountNumber(user.getUserAccountNumber()))
                    .userBank(user.getUserBank())
                    .build();
        });
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.UserInfoDto> getManagers(String requesterId, int page, int size, boolean showInactive) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 관리자 목록을 조회할 수 있습니다.");
        }

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page, size, org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Order.asc("userName"),
                        org.springframework.data.domain.Sort.Order.asc("userIdx")));

        org.springframework.data.domain.Page<User> users;
        if (showInactive) {
            users = userRepository.findByUserType_UtIsAdmin(1, pageable);
        } else {
            users = userRepository.findByUserType_UtIsAdminAndUserIsActive(1, 1, pageable);
        }
        return users.map(user -> {
            Integer adminFlag = (user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1) ? 1 : null;
            return com.recode.Dwaeji.user.dto.UserInfoDto.builder()
                    .userIdx(user.getUserIdx())
                    .userId(user.getUserId())
                    .userName(user.getUserName())
                    .userEmail(user.getUserEmail())
                    .userBirth(user.getUserBirth())
                    .userPhone(user.getUserPhone())
                    .userTypeName(user.getUserType() != null ? user.getUserType().getUtName() : null)
                    .workPlaceName(user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : null)
                    .userIsActive(user.getUserIsActive())
                    .isAdmin(adminFlag)
                    .userHourlyWage(user.getUserHourlyWage())
                    .userAccountName(user.getUserAccountName())
                    .userAccountNumber(maskAccountNumber(user.getUserAccountNumber()))
                    .userBank(user.getUserBank())
                    .build();
        });
    }


    @Override
    @Transactional
    public void updateMyBankInfo(String requesterId, com.recode.Dwaeji.user.dto.BankInfoUpdateDto dto) {
        User user = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        if (dto.getUserBank() != null && !dto.getUserBank().isEmpty()) {
            user.setUserBank(dto.getUserBank());
        }
        if (dto.getUserAccountNumber() != null && !dto.getUserAccountNumber().isEmpty()) {
            user.setUserAccountNumber(dto.getUserAccountNumber());
        }
        if (dto.getUserAccountName() != null && !dto.getUserAccountName().isEmpty()) {
            user.setUserAccountName(dto.getUserAccountName());
        }
        
        if (Boolean.TRUE.equals(dto.getBankConsentAgreed())) {
            user.setBankConsentAgreed(true);
            user.setBankConsentDate(java.time.LocalDateTime.now());
        }
        
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void setTempPassword(String requesterId, Long targetUserIdx, String tempPw) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        boolean isAdmin = (reqIsAdmin != null && reqIsAdmin == 1);
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "임시 비번을 설정할 권한이 없습니다.");
        }

        if (tempPw == null || tempPw.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 비밀번호를 입력해주세요.");
        }

        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        targetUser.setUserIsTempPw(1);
        targetUser.setUserTempPw(tempPw);
        userRepository.save(targetUser);
    }

    @Override
    @Transactional
    public void changePassword(String requesterId, com.recode.Dwaeji.user.dto.ChangePasswordDto dto) {
        User user = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        if (dto.getNewPw() == null || dto.getNewPw().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호를 입력해주세요.");
        }

        // 현재 비밀번호 확인 (임시 비번 상태면 plain text, 일반이면 BCrypt)
        boolean isTempPw = user.getUserIsTempPw() != null && user.getUserIsTempPw() == 1;
        if (isTempPw) {
            if (!dto.getCurrentPw().equals(user.getUserTempPw())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
            }
        } else {
            if (!passwordEncoder.matches(dto.getCurrentPw(), user.getUserPw())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
            }
        }

        // 새 비밀번호로 변경 후 임시 비번 상태 초기화
        user.setUserPw(passwordEncoder.encode(dto.getNewPw()));
        user.setUserIsTempPw(0);
        user.setUserTempPw(null);
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<com.recode.Dwaeji.user.dto.UserTypeDto> getAllUserTypes() {
        return userTypeRepository.findAll().stream()
                .map(com.recode.Dwaeji.user.dto.UserTypeDto::fromEntity)
                .collect(java.util.stream.Collectors.toList());
    }
}
