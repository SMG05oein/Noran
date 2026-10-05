package com.recode.Dwaeji.user.impl;

import com.recode.Dwaeji.JwtUtil;
import com.recode.Dwaeji.common.excel.ExcelDarkTheme;
import com.recode.Dwaeji.gathering.repository.GatheringCommentRepository;
import com.recode.Dwaeji.gathering.repository.GatheringPostRepository;
import com.recode.Dwaeji.gathering.repository.GatheringReportRepository;
import com.recode.Dwaeji.joke.repository.JokeRepository;
import com.recode.Dwaeji.user.database.RefreshToken;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.dto.*;
import com.recode.Dwaeji.user.repository.*;
import com.recode.Dwaeji.user.service.UserService;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyDailyRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkScheduleDailyRepository;
import com.recode.Dwaeji.work_record.repository.WorkRecordHistoryRepository;
import com.recode.Dwaeji.work_record.repository.WorkRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.JpaSort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserTypeRepository userTypeRepository;
    private final WorkPlaceRepository workPlaceRepository;

    private final WorkRecordRepository workRecordRepository;
    private final WorkRecordHistoryRepository workRecordHistoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    private final WorkApplyRepository workApplyRepository;
    private final WorkApplyDailyRepository workApplyDailyRepository;
    private final WorkScheduleDailyRepository workScheduleDailyRepository;
    private final GatheringReportRepository gatheringReportRepository;
    private final GatheringCommentRepository gatheringCommentRepository;
    private final GatheringPostRepository gatheringPostRepository;
    private final JokeRepository jokeRepository;

    @Override
    @Transactional
    public LoginResponseDto login(LoginRequestDto loginRequestDto) {
        if (loginRequestDto.getUserId() != null) {
            loginRequestDto.setUserId(loginRequestDto.getUserId().toLowerCase());
        }

        // 아이디로 사용자 찾기
        User user = userRepository.findByUserId(loginRequestDto.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 잘못되었습니다."));

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

        // 임시 사용자 (엑셀 일괄 등록 생성) 로그인 차단
        if (user.getIsTempUser() != null && user.getIsTempUser() == 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "로그인이 허용되지 않는 사용자 입니다");
        }

        // 비활성화(논리적 삭제) 계정 체크
        if (user.getUserIsActive() == null || user.getUserIsActive() == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비활성화된 계정(또는 퇴사자)입니다. 관리자에게 문의하세요.");
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

        return LoginResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .msg(msg)
                .isTempUser(user.getIsTempUser() != null ? user.getIsTempUser() : 0)
                .build();
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

        if (signupRequestDto.getUserBirth() != null) {
            java.time.Period period = java.time.Period.between(signupRequestDto.getUserBirth(), java.time.LocalDate.now());
            if (period.getYears() < 15) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "만 15세 미만은 회원가입할 수 없습니다.");
            }
        }

        if (userRepository.findByUserId(signupRequestDto.getUserId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용하는 아이디입니다.");
        }


        if (isPhoneDuplicated(signupRequestDto.getUserPhone(), null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 휴대폰 번호입니다.");
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
                .userBirth(signupRequestDto.getUserBirth())
                .userEmail(signupRequestDto.getUserEmail())
                .emailConsentAgreed(Boolean.TRUE.equals(signupRequestDto.getEmailConsentAgreed()))
                .emailConsentDate(Boolean.TRUE.equals(signupRequestDto.getEmailConsentAgreed()) ? LocalDateTime.now() : null)
                .userBank(signupRequestDto.getUserBank())
                .userAccountName(signupRequestDto.getUserAccountName())
                .userAccountNumber(signupRequestDto.getUserAccountNumber())
                .bankConsentAgreed(
                        signupRequestDto.getUserBank() != null && !signupRequestDto.getUserBank().isBlank()
                                && signupRequestDto.getUserAccountNumber() != null && !signupRequestDto.getUserAccountNumber().isBlank())
                .bankConsentDate(
                        (signupRequestDto.getUserBank() != null && !signupRequestDto.getUserBank().isBlank()
                                && signupRequestDto.getUserAccountNumber() != null && !signupRequestDto.getUserAccountNumber().isBlank())
                                ? LocalDateTime.now() : null)
                .userType(userType)
                .workPlace(workPlace)
                .userIsActive(1) // 기본적으로 활성화 상태
                .build();

        userRepository.save(user);
    }

    @Override
    @Transactional
    public void adminRegisterUser(String requesterId, AdminRegisterRequestDto dto) {
        // 1. 요청자 권한 확인
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        if (requester.getUserType() == null || requester.getUserType().getUtIsAdmin() == null
                || requester.getUserType().getUtIsAdmin() != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 직원을 등록할 수 있습니다.");
        }

        // 2. 아이디 중복 확인
        String lowerUserId = dto.getUserId().toLowerCase();
        if (userRepository.findByUserId(lowerUserId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다.");
        }


        if (dto.getUserPhone() != null && !dto.getUserPhone().isEmpty()
                && isPhoneDuplicated(dto.getUserPhone(), null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 휴대폰 번호입니다.");
        }

        // 나이 체크 (만 15세 미만 등록 불가)
        if (dto.getUserBirth() != null) {
            java.time.Period period = java.time.Period.between(dto.getUserBirth(), java.time.LocalDate.now());
            if (period.getYears() < 15) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "만 15세 미만 직원은 등록할 수 없습니다.");
            }
        }

        // 3. 소속 지점 조회
        com.recode.Dwaeji.user.database.WorkPlace workPlace = workPlaceRepository.findById(dto.getFkWorkPlaceIdx())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 근무지입니다."));

        // 4. UserType 결정 (WORKER: ID=5 고정, ADMIN: fkUtIdx 사용 기본값=1)
        com.recode.Dwaeji.user.database.UserType userType;
        if ("ADMIN".equalsIgnoreCase(dto.getRole())) {
            Long utIdx = dto.getFkUtIdx() != null ? dto.getFkUtIdx() : 1L;
            userType = userTypeRepository.findById(utIdx)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 직급 ID입니다."));
        } else {
            // WORKER: 알바생 기본 UserType (ID=5)
            userType = userTypeRepository.findById(5L)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "기본 근무 형태를 찾을 수 없습니다."));
        }

        // 5. 유저 엔티티 생성 및 저장
        User newUser = User.builder()
                .userId(lowerUserId)
                .userPw(passwordEncoder.encode(dto.getUserPw()))
                .userName(dto.getUserName())
                .userPhone(dto.getUserPhone())
                .userBirth(dto.getUserBirth())
                .userType(userType)
                .workPlace(workPlace)
                .userIsActive(1)
                .build();

        userRepository.save(newUser);
    }

    @Override
    @Transactional
    public void updateUser(String requesterId, Long targetUserIdx, UserUpdateDto userUpdateDto) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 사용자를 찾을 수 없습니다."));

        if (targetUser.getUserIsActive() != null && targetUser.getUserIsActive() == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "퇴사자의 정보는 수정할 수 없습니다. 시스템 관리자에게 문의하세요.");
        }

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
            if (isPhoneDuplicated(userUpdateDto.getUserPhone(), targetUserIdx)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 휴대폰 번호입니다.");
            }
            targetUser.setUserPhone(userUpdateDto.getUserPhone().trim());
        }
        if (userUpdateDto.getUserBirth() != null) {
            targetUser.setUserBirth(userUpdateDto.getUserBirth());
        }
        if (userUpdateDto.getFkUtIdx() != null) {
            if (!isAdmin) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "근무 형태를 변경할 권한이 없습니다.");
            }
            boolean isSelf = java.util.Objects.equals(requester.getUserIdx(), targetUserIdx)
                    || java.util.Objects.equals(requester.getUserId(), targetUser.getUserId());
            Long currentUtIdx = targetUser.getUserType() != null ? targetUser.getUserType().getUtIdx() : null;
            // 본인 직급은 변경 불가 (동일 값 재전송은 no-op)
            if (isSelf) {
                if (!java.util.Objects.equals(currentUtIdx, userUpdateDto.getFkUtIdx())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본인의 직급은 변경할 수 없습니다.");
                }
            } else {
                com.recode.Dwaeji.user.database.UserType userType = userTypeRepository.findById(userUpdateDto.getFkUtIdx())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 근무 형태입니다."));
                targetUser.setUserType(userType);
            }
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
            if (userUpdateDto.getUserAccountNumber() != null && !userUpdateDto.getUserAccountNumber().equals("기재")) {
                targetUser.setUserAccountNumber(userUpdateDto.getUserAccountNumber());
            }
            if (userUpdateDto.getUserHourlyWage() != null) {
                targetUser.setUserHourlyWage(userUpdateDto.getUserHourlyWage());
            }
        }
        targetUser.setUserEmail(userUpdateDto.getUserEmail());

        if (userUpdateDto.getEmailConsentAgreed() != null) {
            boolean isAgreed = userUpdateDto.getEmailConsentAgreed() == 1;
            targetUser.setEmailConsentAgreed(isAgreed);
            if (isAgreed && targetUser.getEmailConsentDate() == null) {
                targetUser.setEmailConsentDate(java.time.LocalDateTime.now());
            } else if (!isAgreed) {
                targetUser.setEmailConsentDate(null);
            }
        }

        userRepository.save(targetUser);
    }

    @Override
    @Transactional
    public void bulkUpdateUsers(String requesterId, UserBulkUpdateDto dto) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "일괄 업데이트 권한이 없습니다.");
        }

        if (dto.getUserIdxList() == null || dto.getUserIdxList().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업데이트할 사용자가 선택되지 않았습니다.");
        }

        com.recode.Dwaeji.user.database.UserType bulkUserType = null;
        if (dto.getFkUtIdx() != null) {
            bulkUserType = userTypeRepository.findById(dto.getFkUtIdx())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 근무 형태입니다."));
        }

        java.util.List<User> users = userRepository.findAllById(dto.getUserIdxList());
        for (User u : users) {
            if (u.getUserIsActive() != null && u.getUserIsActive() == 0) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "퇴사자의 정보는 일괄 수정할 수 없습니다. (" + u.getUserName() + ") 시스템 관리자에게 문의하세요.");
            }
            boolean isSelf = java.util.Objects.equals(requester.getUserIdx(), u.getUserIdx())
                    || java.util.Objects.equals(requester.getUserId(), u.getUserId());
            if (dto.getUserHourlyWage() != null) {
                u.setUserHourlyWage(dto.getUserHourlyWage());
            }
            if (dto.getUserIsActive() != null) {
                if (isSelf) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본인 계정 상태는 일괄 변경할 수 없습니다.");
                }
                u.setUserIsActive(dto.getUserIsActive());
            }
            if (bulkUserType != null) {
                if (isSelf) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본인의 직급은 변경할 수 없습니다.");
                }
                u.setUserType(bulkUserType);
            }
        }
        userRepository.saveAll(users);
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
        targetUser.setUserWithdrawnAt(LocalDateTime.now());
    }

    @Override
    @Transactional
    public void withdrawUser(String requesterId) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        // 논리적 삭제
        requester.setUserIsActive(0);
        requester.setUserWithdrawnAt(LocalDateTime.now());
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

        // 재직(1) 및 휴직(2)은 영구 삭제 불가 -> 오직 퇴사(0) 상태인 사용자만 영구 삭제 허용
        if (targetUser.getUserIsActive() != null && targetUser.getUserIsActive() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "퇴사 처리된 사용자만 영구 삭제할 수 있습니다. 먼저 퇴사 처리를 진행해 주세요.");
        }

        // 1. 삭제 전 덤프 로그 작성 (User NN 컬럼 및 WorkRecord NN 컬럼)
        String deleteDate = java.time.LocalDate.now().toString();
        String targetUserName = targetUser.getUserName() != null ? targetUser.getUserName().trim() : "알수없음";
        String targetWpName = (targetUser.getWorkPlace() != null && targetUser.getWorkPlace().getWpName() != null)
                ? targetUser.getWorkPlace().getWpName().trim()
                : "미소속";

        List<com.recode.Dwaeji.work_record.database.WorkRecord> workRecords = workRecordRepository.findByUser_UserIdx(targetUserIdx);

        StringBuilder sb = new StringBuilder();
        sb.append("================================================================================\n");
        sb.append("[USER HARD DELETE BACKUP DUMP]\n");
        sb.append("삭제 일시: ").append(java.time.LocalDateTime.now()).append("\n");
        sb.append("수행 관리자: ").append(requester.getUserName()).append(" (ID: ").append(requester.getUserId()).append(", userIdx: ").append(requester.getUserIdx()).append(")\n");
        sb.append("--------------------------------------------------------------------------------\n");
        sb.append("1. 대상 사용자 정보 (User NN / 핵심 컬럼)\n");
        sb.append("※ 참고: user_idx는 PK(AUTO_INCREMENT)입니다. 수동 복구 INSERT 시 user_idx를 명시하여 넣거나, 신규 발급 시 연관 외래키를 새 user_idx로 매핑해야 합니다.\n");
        sb.append(" - user_idx (PK): ").append(targetUser.getUserIdx()).append("\n");
        sb.append(" - user_id (NN): ").append(targetUser.getUserId()).append("\n");
        sb.append(" - user_name (NN): ").append(targetUser.getUserName()).append("\n");
        sb.append(" - user_phone (NN): ").append(targetUser.getUserPhone()).append("\n");
        sb.append(" - user_pw (NN, 암호화해시): ").append(targetUser.getUserPw()).append("\n");
        sb.append(" - user_birth (생년월일 가이드): 1901-01-01 (기존값: ").append(targetUser.getUserBirth()).append(")\n");
        sb.append(" - user_email: ").append(targetUser.getUserEmail()).append("\n");
        sb.append(" - user_hourly_wage (시급 가이드): 0 (기존값: ").append(targetUser.getUserHourlyWage()).append(")\n");
        sb.append(" - user_is_active: 0 (퇴사)\n");
        sb.append(" - is_temp_user (NN): ").append(targetUser.getIsTempUser() != null ? targetUser.getIsTempUser() : 0).append("\n");
        sb.append(" - user_type (NN, fk_ut_idx): ").append(targetUser.getUserType() != null ? targetUser.getUserType().getUtIdx() : "5").append(" (").append(targetUser.getUserType() != null ? targetUser.getUserType().getUtName() : "알바생").append(")\n");
        sb.append(" - work_place (NN, fk_work_place_idx): ").append(targetUser.getWorkPlace() != null ? targetUser.getWorkPlace().getWpIdx() : "1").append(" (").append(targetWpName).append(")\n");
        sb.append("--------------------------------------------------------------------------------\n");
        sb.append("2. 근무 기록 (WorkRecord) 목록 (총 ").append(workRecords.size()).append("건)\n");
        for (com.recode.Dwaeji.work_record.database.WorkRecord wr : workRecords) {
            String recordWp = wr.getWorkPlace() != null ? wr.getWorkPlace().getWpName() : targetWpName;
            Long recordWpIdx = wr.getWorkPlace() != null ? wr.getWorkPlace().getWpIdx() : (targetUser.getWorkPlace() != null ? targetUser.getWorkPlace().getWpIdx() : null);
            sb.append(String.format(" [WR] wr_idx=%d | user_idx=%d | date=%s | wpIdx=%s(%s) | start=%s | end=%s | rest=%s | remarks=%s\n",
                    wr.getWrIdx(), targetUserIdx, wr.getWrDate(), recordWpIdx, recordWp,
                    wr.getWrStartTime(), wr.getWrEndTime(), wr.getWrRestTime(),
                    wr.getWrRemarks() != null ? wr.getWrRemarks() : ""));
        }
        sb.append("================================================================================\n");

        String dumpContent = sb.toString();
        log.warn("[HARD_DELETE_USER] {}\n{}", targetUserName, dumpContent);

        // 2. logs/{삭제일}-{이름}-{소속}.zip 압축 파일 생성
        try {
            java.io.File logDir = new java.io.File("logs");
            if (!logDir.exists()) {
                logDir.mkdirs();
            }
            String safeUserName = targetUserName.replaceAll("[\\\\/:*?\"<>|]", "_");
            String safeWpName = targetWpName.replaceAll("[\\\\/:*?\"<>|]", "_");
            String zipFileName = String.format("%s-%s-%s.zip", deleteDate, safeUserName, safeWpName);
            java.io.File zipFile = new java.io.File(logDir, zipFileName);

            try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(new java.io.FileOutputStream(zipFile))) {
                java.util.zip.ZipEntry entry = new java.util.zip.ZipEntry("backup_dump.txt");
                zos.putNextEntry(entry);
                byte[] bytes = dumpContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                zos.write(bytes, 0, bytes.length);
                zos.closeEntry();
            }
        } catch (Exception e) {
            log.error("영구 삭제 백업 zip 파일 생성 중 오류 발생: {}", e.getMessage(), e);
        }

        // 3. 자식 데이터 일괄 삭제 (외래키 제약조건 완전 해소)
        refreshTokenRepository.deleteByUser_UserIdx(targetUserIdx);
        workRecordHistoryRepository.deleteByTargetUser_UserIdx(targetUserIdx);
        workRecordHistoryRepository.deleteByAdminUser_UserIdx(targetUserIdx);
        workRecordRepository.deleteByUser_UserIdx(targetUserIdx);

        // 근무 신청 및 일별 스케줄 삭제
        workApplyDailyRepository.deleteByUser_UserIdx(targetUserIdx);
        workScheduleDailyRepository.deleteByUser_UserIdx(targetUserIdx);
        workApplyRepository.deleteByUser_UserIdx(targetUserIdx);

        // 게시판/댓글/신고/농담 데이터 삭제
        gatheringReportRepository.deleteByUser_UserIdx(targetUserIdx);
        gatheringCommentRepository.deleteByUser_UserIdx(targetUserIdx);
        gatheringCommentRepository.deleteByPost_User_UserIdx(targetUserIdx); // 사용자가 쓴 글에 달린 타인의 댓글 먼저 삭제
        gatheringPostRepository.deleteByUser_UserIdx(targetUserIdx);
        jokeRepository.deleteByUser_UserIdx(targetUserIdx);

        // 4. 실제 사용자 물리 삭제
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
        targetUser.setUserWithdrawnAt(null);
    }

    @Override
    @Transactional
    public void setLeaveStatus(String requesterId, Long targetUserIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대상을 찾을 수 없습니다."));

        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
        }

        if (targetUser.getUserIsActive() != null && targetUser.getUserIsActive() == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 퇴사 처리된 사용자입니다. 복구를 먼저 진행해주세요.");
        }

        targetUser.setUserIsActive(2); // 2: 휴직
    }

    @Override
    @Transactional
    public void cancelLeave(String requesterId, Long targetUserIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대상을 찾을 수 없습니다."));

        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
        }

        if (targetUser.getUserIsActive() == null || targetUser.getUserIsActive() != 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 사용자는 현재 휴직 상태가 아닙니다.");
        }

        targetUser.setUserIsActive(1); // 1: 재직 (복직)
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
    public UserInfoDto getUserInfo(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return UserInfoDto.fromEntity(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserInfoDto getUserInfoByIdx(String requesterId, Long targetUserIdx) {
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

        return UserInfoDto.fromEntity(user);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountDetailsDto getAccountDetails(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return AccountDetailsDto.fromEntity(user);
    }

    @Override
    @Transactional(readOnly = true)
    public SensitiveInfoDto getSensitiveInfo(String requesterId, Long targetUserIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        Integer canViewSensitive = requester.getUserType().getUtCanViewSensitive();
        if (canViewSensitive == null || canViewSensitive != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "민감 정보를 조회할 권한이 없습니다.");
        }

        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return SensitiveInfoDto.fromEntity(targetUser);
    }

    @Override
    @Transactional
    public void updateSensitiveInfo(String requesterId, Long targetUserIdx, SensitiveInfoDto dto) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        Integer canEditSensitive = requester.getUserType().getUtCanEditSensitive();
        if (canEditSensitive == null || canEditSensitive != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "민감 정보를 수정할 권한이 없습니다.");
        }

        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        if (targetUser.getUserIsActive() != null && targetUser.getUserIsActive() == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "퇴사자의 정보는 수정할 수 없습니다. 시스템 관리자에게 문의하세요.");
        }


        if (dto.getUserAccountName() != null) {
            targetUser.setUserAccountName(dto.getUserAccountName());
        }
        if (dto.getUserAccountNumber() != null && !dto.getUserAccountNumber().equals("기재")) {
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
    public TokenRefreshResponseDto refreshAccessToken(String refreshToken) {
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
            if (user.getUserIsActive() == null || user.getUserIsActive() == 0) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비활성화된 계정(또는 퇴사자)입니다.");
            }
            String role = user.getUserType() != null ? user.getUserType().getUtName() : "알바생";
            String authType = user.getWorkPlace() != null ? user.getWorkPlace().getWpName() : "노란돼지";

            // 4. 새로운 액세스 토큰 생성
            String newAccessToken = jwtUtil.createAccessToken(user.getUserId(), role, authType);

            return new TokenRefreshResponseDto(newAccessToken, "새로운 액세스 토큰이 발급되었습니다.");

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "리프레시 토큰 검증에 실패했습니다.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserInfoDto> searchWorkers(String requesterId, String userName, Long workPlaceIdx, int page, int size, Integer isActive, String sortBy, String sortDir) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 직원 목록을 조회할 수 있습니다.");
        }

        Pageable pageable = buildAdminUserPageable(page, size, sortBy, sortDir, true, isActive);

        boolean canAccessArchive = requester.getUserType() != null && requester.getUserType().getUtCanAccessArchive() != null && requester.getUserType().getUtCanAccessArchive() == 1;

        Page<UserWithSeqProjection> projPage =
                userRepository.searchWorkersNative(isActive, workPlaceIdx, userName, pageable);

        return mapUserProjectionsWithNameCount(projPage, canAccessArchive);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserInfoDto> getManagers(String requesterId, int page, int size, Integer isActive, String sortBy, String sortDir) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 관리자 목록을 조회할 수 있습니다.");
        }

        Pageable pageable = buildAdminUserPageable(page, size, sortBy, sortDir, false, isActive);

        Page<User> users;
        if (isActive == null) {
            users = userRepository.findAllWorkersFetch(1, pageable);
        } else {
            users = userRepository.findWorkersFetch(1, isActive, pageable);
        }
        return users.map(UserInfoDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserInfoDto> getAllEmployees(String requesterId, String userName, Long workPlaceIdx, int page, int size, Integer isActive, String sortBy, String sortDir) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer reqIsAdmin = requester.getUserType().getUtIsAdmin();
        if (reqIsAdmin == null || reqIsAdmin != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 전체 직원 목록을 조회할 수 있습니다.");
        }

        Pageable pageable = buildAdminUserPageable(page, size, sortBy, sortDir, true, isActive);

        boolean canAccessArchive = requester.getUserType() != null && requester.getUserType().getUtCanAccessArchive() != null && requester.getUserType().getUtCanAccessArchive() == 1;

        Page<UserWithSeqProjection> projPage =
                userRepository.searchAllEmployeesNative(isActive, workPlaceIdx, userName, pageable);

        return mapUserProjectionsWithNameCount(projPage, canAccessArchive);
    }

    /**
     * nameSeq = 동일 실명 활성 인원 수.
     * 동명이인 N명이면 전원(첫 조회분 포함) nameSeq = N (&gt; 1) → Front #userIdx 배지.
     */
    private Page<UserInfoDto> mapUserProjectionsWithNameCount(
            Page<UserWithSeqProjection> projPage, boolean canAccessArchive) {
        java.util.Map<Long, Long> nameCountByUserIdx = new java.util.HashMap<>();
        for (UserWithSeqProjection p : projPage.getContent()) {
            if (p.getUserIdx() == null) continue;
            nameCountByUserIdx.computeIfAbsent(p.getUserIdx(), id -> {
                Long c = userRepository.findNameSeqByUserIdx(id);
                return (c != null && c > 0) ? c : 1L;
            });
        }

        java.time.LocalDateTime oneYearAgo = java.time.LocalDateTime.now().minusYears(1);

        return projPage.map(p -> {
            String userName = p.getUserName();
            String userPhone = p.getUserPhone();
            String userBank = p.getUserBank();
            String hasAccount = (p.getUserAccountNumber() != null && !p.getUserAccountNumber().trim().isEmpty() && !p.getUserAccountNumber().equals("기재")) ? "기재" : null;
            if (p.getUserAccountNumber() != null && p.getUserAccountNumber().equals("기재")) {
                hasAccount = "기재";
            }
            Long nameCount = p.getUserIdx() != null
                    ? nameCountByUserIdx.getOrDefault(p.getUserIdx(), 1L)
                    : 1L;

            if (p.getUserIsActive() != null && p.getUserIsActive() == 0 && p.getUserWithdrawnAt() != null) {
                if (p.getUserWithdrawnAt().isBefore(oneYearAgo) && !canAccessArchive) {
                    if (userName != null && !userName.isEmpty()) {
                        userName = "***";
                    }
                    if (userPhone != null && !userPhone.isEmpty()) {
                        userPhone = "***";
                    }
                    if (userBank != null && !userBank.isEmpty()) {
                        userBank = "***";
                    }
                    if (hasAccount != null) {
                        hasAccount = "***";
                    }
                }
            }

            return UserInfoDto.builder()
                    .userIdx(p.getUserIdx())
                    .userId(p.getUserId())
                    .userName(userName)
                    .userEmail(p.getUserEmail())
                    .userBirth(p.getUserBirth())
                    .userPhone(userPhone)
                    .userTypeName(p.getUserTypeName())
                    .fkUtIdx(p.getFkUtIdx())
                    .workPlaceName(p.getWorkPlaceName())
                    .workPlaceIdx(p.getWorkPlaceIdx())
                    .userIsActive(p.getUserIsActive())
                    .userAccountName(p.getUserAccountName())
                    .userAccountNumber(hasAccount)
                    .userBank(userBank)
                    .userHourlyWage(p.getUserHourlyWage())
                    .userWithdrawnAt(p.getUserWithdrawnAt())
                    .isAdmin(p.getIsAdmin())
                    .nameSeq(nameCount)
                    .build();
        });
    }

    @Override
    @Transactional
    public void updateMyBankInfo(String requesterId, BankInfoUpdateDto dto) {
        User user = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));

        if (dto.getUserBank() != null && !dto.getUserBank().isEmpty()) {
            user.setUserBank(dto.getUserBank());
        }
        if (dto.getUserAccountNumber() != null && !dto.getUserAccountNumber().isEmpty() && !dto.getUserAccountNumber().equals("기재")) {
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
    public void changePassword(String requesterId, ChangePasswordDto dto) {
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
    public java.util.List<UserTypeDto> getAllUserTypes() {
        return userTypeRepository.findAll().stream()
                .map(UserTypeDto::fromEntity)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadEmployeesExcel(String requesterId, Long workPlaceIdx) {
        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
        Integer canExport = requester.getUserType() != null ? requester.getUserType().getUtCanExportExcel() : null;
        if (canExport == null || canExport != 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "엑셀 다운로드 권한이 없습니다.");
        }

        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getUserName() == null || !u.getUserName().equals("탈퇴자_비식별화"))
                .filter(u -> workPlaceIdx == null
                        || (u.getWorkPlace() != null && workPlaceIdx.equals(u.getWorkPlace().getWpIdx())))
                .collect(java.util.stream.Collectors.toList());

        Map<String, List<User>> byWp = new java.util.LinkedHashMap<>();
        for (User u : users) {
            String sheetName = (u.getWorkPlace() != null && u.getWorkPlace().getWpName() != null)
                    ? u.getWorkPlace().getWpName() : "미소속";
            // Excel sheet name max 31 chars
            if (sheetName.length() > 31) sheetName = sheetName.substring(0, 31);
            byWp.computeIfAbsent(sheetName, k -> new java.util.ArrayList<>()).add(u);
        }

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            String[] headers = {"No", "소속", "이름", "아이디", "시급", "연락처", "상태"};
            var dark = ExcelDarkTheme.create(workbook);
            for (Map.Entry<String, List<User>> e : byWp.entrySet()) {
                org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet(e.getKey());
                org.apache.poi.ss.usermodel.Row header = sheet.createRow(0);
                for (int i = 0; i < headers.length; i++) header.createCell(i).setCellValue(headers[i]);
                int r = 1;
                for (User u : e.getValue()) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(r++);
                    String status = u.getUserIsActive() == null ? ""
                            : (u.getUserIsActive() == 1 ? "재직" : (u.getUserIsActive() == 2 ? "휴직" : "퇴사"));
                    row.createCell(0).setCellValue(r - 1);
                    row.createCell(1).setCellValue(u.getWorkPlace() != null ? u.getWorkPlace().getWpName() : "");
                    row.createCell(2).setCellValue(u.getUserName() != null ? u.getUserName() : "");
                    row.createCell(3).setCellValue(u.getUserId() != null ? u.getUserId() : "");
                    row.createCell(4).setCellValue(u.getUserHourlyWage() != null ? u.getUserHourlyWage() : 0);
                    row.createCell(5).setCellValue(u.getUserPhone() != null ? u.getUserPhone() : "");
                    row.createCell(6).setCellValue(status);
                }
                for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
                ExcelDarkTheme.apply(sheet, dark, Math.max(r - 1, 0), headers.length);
            }
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "직원 엑셀 생성 실패: " + ex.getMessage());
        }
    }

    /** 하이픈/공백 무시하고 휴대폰 번호 중복 여부. excludeUserIdx가 있으면 해당 유저는 제외(본인 수정). */
    /**
     * 직원관리 목록 정렬. sortBy 화이트리스트만 허용 (name|branch|status).
     * native=true: SQL 컬럼 (JpaSort.unsafe) — numbered_u.user_name / wp.wp_name / numbered_u.user_is_active
     * native=false: JPQL paths — userName / workPlace.wpName / userIsActive
     * 기본: userName ASC, userIdx ASC
     */
    private Pageable buildAdminUserPageable(
            int page, int size, String sortBy, String sortDir, boolean nativeQuery, Integer isActive) {
        Sort.Direction direction =
                "desc".equalsIgnoreCase(sortDir)
                        ? Sort.Direction.DESC
                        : Sort.Direction.ASC;

        String key = sortBy == null ? "" : sortBy.trim().toLowerCase();

        if (isActive != null && isActive == 0 && key.isEmpty()) {
            direction = Sort.Direction.DESC;
        }

        Sort sort;
        if (nativeQuery) {
            String primary = switch (key) {
                case "branch" -> "wp.wp_name";
                case "status" -> "numbered_u.user_is_active";
                case "name" -> "numbered_u.user_name";
                default ->
                        (isActive != null && isActive == 0) ? "numbered_u.user_withdrawn_at" : "numbered_u.user_name";
            };
            // native: domain property 검증 우회, 화이트리스트 SQL만
            sort = JpaSort.unsafe(
                            Sort.Direction.DESC, "ut.ut_is_admin")
                    .and(JpaSort.unsafe(direction, primary))
                    .and(JpaSort.unsafe(
                            Sort.Direction.ASC, "numbered_u.user_idx"));
        } else {
            String primary = switch (key) {
                case "branch" -> "workPlace.wpName";
                case "status" -> "userIsActive";
                case "name" -> "userName";
                default -> (isActive != null && isActive == 0) ? "userWithdrawnAt" : "userName";
            };
            sort = Sort
                    .by(Sort.Direction.DESC, "userType.utIsAdmin")
                    .and(Sort.by(direction, primary))
                    .and(Sort.by(
                            Sort.Direction.ASC, "userIdx"));
        }
        return PageRequest.of(page, size, sort);
    }

    private boolean isPhoneDuplicated(String userPhone, Long excludeUserIdx) {
        if (userPhone == null || userPhone.isBlank()) {
            return false;
        }
        String phoneDigits = userPhone.replaceAll("[^0-9]", "");
        if (phoneDigits.isEmpty()) {
            return false;
        }
        return userRepository.countByPhoneDigitsExcluding(phoneDigits, excludeUserIdx) > 0;
    }
}
