package com.recode.Dwaeji.user.controller;

import com.recode.Dwaeji.user.dto.LoginRequestDto;
import com.recode.Dwaeji.user.dto.LoginResponseDto;
import com.recode.Dwaeji.user.dto.SignupRequestDto;
import com.recode.Dwaeji.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.recode.Dwaeji.user.dto.UserUpdateDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpHeaders;
import jakarta.validation.Valid;

@Tag(name="회원 인증", description = "회원 인증 관련 API 명세서입니다.")
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "로그인", description = "아이디와 비밀번호로 로그인합니다. 성공 시 액세스 토큰을 반환하고, 리프레시 토큰은 HttpOnly 쿠키로 발급합니다.")
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@Valid @RequestBody LoginRequestDto loginRequestDto) {
        LoginResponseDto loginResponse = userService.login(loginRequestDto);
        
        // HttpOnly 쿠키 생성 (리프레시 토큰)
        ResponseCookie cookie = ResponseCookie.from("refreshToken", loginResponse.getRefreshToken())
                .httpOnly(true)
                .secure(false) // HTTPS 적용 시 true로 변경
                .path("/")
                .maxAge(3 * 24 * 60 * 60) // 3일
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(loginResponse);
    }

    @Operation(summary = "회원가입", description = "새로운 유저를 등록합니다.")
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@Valid @RequestBody SignupRequestDto signupRequestDto) {
        userService.signup(signupRequestDto);
        return ResponseEntity.ok("회원가입이 완료되었습니다.");
    }

    @Operation(summary = "유저 정보 수정", description = "특정 유저의 정보를 수정합니다. 관리자가 아니면 본인의 정보만 수정할 수 있습니다.")
    @PutMapping("/{userIdx}")
    public ResponseEntity<String> updateUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx,
            @RequestBody UserUpdateDto userUpdateDto) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.updateUser(requesterId, userIdx, userUpdateDto);
        return ResponseEntity.ok("회원 정보가 성공적으로 수정되었습니다.");
    }

    @Operation(summary = "유저 삭제(비활성화)", description = "특정 유저를 삭제(비활성화)합니다. 관리자만 호출 가능합니다.")
    @DeleteMapping("/{userIdx}")
    public ResponseEntity<String> deleteUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.deleteUser(requesterId, userIdx);
        return ResponseEntity.ok("회원 계정이 비활성화되었습니다.");
    }

    @Operation(summary = "유저 영구 삭제(물리 삭제)", description = "특정 유저와 관련된 데이터(근무 기록, 지원 내역 등)를 포함하여 DB에서 완전히 삭제합니다. 관리자만 호출 가능합니다.")
    @DeleteMapping("/{userIdx}/hard")
    public ResponseEntity<String> hardDeleteUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.hardDeleteUser(requesterId, userIdx);
        return ResponseEntity.ok("회원 정보가 데이터베이스에서 영구적으로 삭제되었습니다.");
    }

    @Operation(summary = "유저 복구(활성화)", description = "삭제된 유저를 복구(활성화)합니다. 관리자만 호출 가능합니다.")
    @PostMapping("/{userIdx}/restore")
    public ResponseEntity<String> restoreUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.restoreUser(requesterId, userIdx);
        return ResponseEntity.ok("회원 계정이 성공적으로 복구되었습니다.");
    }

    @Operation(summary = "유저 휴직 처리", description = "특정 유저를 휴직(userIsActive=2) 처리합니다. 관리자만 호출 가능합니다.")
    @PutMapping("/{userIdx}/leave")
    public ResponseEntity<String> setLeaveStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.setLeaveStatus(requesterId, userIdx);
        return ResponseEntity.ok("회원 계정이 휴직 상태로 변경되었습니다.");
    }

    @Operation(summary = "유저 복직 처리", description = "휴직 중인 유저를 복직(userIsActive=1) 처리합니다. 관리자만 호출 가능합니다.")
    @PutMapping("/{userIdx}/leave/cancel")
    public ResponseEntity<String> cancelLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.cancelLeave(requesterId, userIdx);
        return ResponseEntity.ok("회원 계정이 복직(재직) 상태로 변경되었습니다.");
    }

    @Operation(summary = "알바생 본인 계정 탈퇴", description = "알바생 본인이 스스로 계정을 탈퇴(Soft Delete) 처리합니다.")
    @DeleteMapping("/me/withdraw")
    public ResponseEntity<String> withdrawUser(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.withdrawUser(requesterId);
        return ResponseEntity.ok("회원 탈퇴가 완료되었습니다.");
    }

    @Operation(summary = "내 정보 조회", description = "현재 로그인된 사용자의 상세 정보를 조회합니다.")
    @GetMapping("/me")
    public ResponseEntity<com.recode.Dwaeji.user.dto.UserInfoDto> getMyInfo(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        String requesterId = userDetails.getUsername();
        com.recode.Dwaeji.user.dto.UserInfoDto userInfo = userService.getUserInfo(requesterId);
        return ResponseEntity.ok(userInfo);
    }

    @Operation(summary = "특정 유저 정보 조회", description = "특정 사용자의 상세 정보(마스킹됨)를 조회합니다. 관리자이거나 본인일 경우에만 조회 가능합니다.")
    @GetMapping("/{userIdx}")
    public ResponseEntity<com.recode.Dwaeji.user.dto.UserInfoDto> getUserInfoByIdx(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        String requesterId = userDetails.getUsername();
        com.recode.Dwaeji.user.dto.UserInfoDto userInfo = userService.getUserInfoByIdx(requesterId, userIdx);
        return ResponseEntity.ok(userInfo);
    }

    @Operation(summary = "다수 유저 일괄 업데이트", description = "관리자 전용. 선택한 여러 명의 유저의 상태나 시급을 일괄 변경합니다.")
    @PutMapping("/bulk-update")
    public ResponseEntity<String> bulkUpdateUsers(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody com.recode.Dwaeji.user.dto.UserBulkUpdateDto dto) {
        if (userDetails == null) return ResponseEntity.status(401).body("로그인이 필요합니다.");
        userService.bulkUpdateUsers(userDetails.getUsername(), dto);
        return ResponseEntity.ok("선택한 유저들의 정보가 성공적으로 일괄 업데이트되었습니다.");
    }

    @Operation(summary = "토큰 재발급", description = "HttpOnly 쿠키로 전달된 리프레시 토큰을 확인하여 새로운 액세스 토큰을 발급합니다.")
    @PostMapping("/refresh")
    public ResponseEntity<com.recode.Dwaeji.user.dto.TokenRefreshResponseDto> refresh(
            @org.springframework.web.bind.annotation.CookieValue(value = "refreshToken", required = false) String refreshToken) {
        com.recode.Dwaeji.user.dto.TokenRefreshResponseDto response = userService.refreshAccessToken(refreshToken);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "직급(UserType) 목록 조회", description = "전체 직급(UserType) 목록을 조회합니다.")
    @GetMapping("/user-types")
    public ResponseEntity<java.util.List<com.recode.Dwaeji.user.dto.UserTypeDto>> getAllUserTypes() {
        return ResponseEntity.ok(userService.getAllUserTypes());
    }


    @Operation(summary = "일반 직원 검색", description = "관리자 전용. 이름, 소속 지점으로 알바생(직원)을 검색하고 10명 단위로 페이징하여 조회합니다.")
    @GetMapping("/admin/workers")
    public ResponseEntity<org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.UserInfoDto>> searchWorkers(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String userName,
            @RequestParam(required = false) Long workPlaceIdx,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer isActive) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(userService.searchWorkers(userDetails.getUsername(), userName, workPlaceIdx, page, size, isActive));
    }

    @Operation(summary = "관리자 목록 조회", description = "관리자 전용. 관리자 계정만 10명 단위로 페이징하여 조회합니다.")
    @GetMapping("/admin/managers")
    public ResponseEntity<org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.UserInfoDto>> getManagers(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer isActive) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(userService.getManagers(userDetails.getUsername(), page, size, isActive));
    }

    @Operation(summary = "전체 직원 조회", description = "관리자 전용. 직급과 무관하게 전체 직원을 페이징하여 조회합니다.")
    @GetMapping("/admin/all")
    public ResponseEntity<org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.UserInfoDto>> getAllEmployees(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String userName,
            @RequestParam(required = false) Long workPlaceIdx,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer isActive) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(userService.getAllEmployees(userDetails.getUsername(), userName, workPlaceIdx, page, size, isActive));
    }

    @Operation(summary = "직원 엑셀 다운로드", description = "근무지별 Sheet로 직원 목록을 엑셀 다운로드합니다.")
    @GetMapping("/admin/excel")
    public ResponseEntity<byte[]> downloadEmployeesExcel(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long workPlaceIdx) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        byte[] bytes = userService.downloadEmployeesExcel(userDetails.getUsername(), workPlaceIdx);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=employees.xlsx")
                .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @Operation(summary = "임시 비밀번호 설정", description = "관리자 전용. 특정 유저의 임시 비밀번호를 설정합니다.")
    @PostMapping("/{userIdx}/temp-password")
    public ResponseEntity<String> setTempPassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx,
            @RequestBody java.util.Map<String, String> body) {
        if (userDetails == null) return ResponseEntity.status(401).body("로그인이 필요합니다.");
        userService.setTempPassword(userDetails.getUsername(), userIdx, body.get("tempPw"));
        return ResponseEntity.ok("임시 비밀번호가 설정되었습니다.");
    }

    @Operation(summary = "비밀번호 변경", description = "현재 비밀번호(or 임시 비밀번호)를 확인 후 새 비밀번호로 변경합니다. 성공 시 임시 비밀번호 상태가 해제됩니다.")
    @PostMapping("/me/change-password")
    public ResponseEntity<String> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody com.recode.Dwaeji.user.dto.ChangePasswordDto changePasswordDto) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.changePassword(requesterId, changePasswordDto);
        return ResponseEntity.ok("비밀번호가 성공적으로 변경되었습니다.");
    }

    @Operation(summary = "내 계좌 원문 조회", description = "본인에 한해 마스킹되지 않은 계좌 원문을 조회합니다.")
    @GetMapping("/me/account-details")
    public ResponseEntity<com.recode.Dwaeji.user.dto.AccountDetailsDto> getMyAccountDetails(
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        String requesterId = userDetails.getUsername();
        return ResponseEntity.ok(userService.getAccountDetails(requesterId));
    }

    @Operation(summary = "내 은행 정보 수정", description = "본인의 은행명과 계좌번호를 수정합니다. 로그인된 유저 본인만 호출 가능합니다.")
    @PutMapping("/me/bank-info")
    public ResponseEntity<String> updateMyBankInfo(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody com.recode.Dwaeji.user.dto.BankInfoUpdateDto dto) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.updateMyBankInfo(requesterId, dto);
        return ResponseEntity.ok("은행 정보가 성공적으로 수정되었습니다.");
    }

    @Operation(summary = "유저 민감 정보 조회", description = "관리자 전용. 특정 유저의 마스킹되지 않은 민감 정보를 조회합니다.")
    @GetMapping("/{userIdx}/sensitive-info")
    public ResponseEntity<com.recode.Dwaeji.user.dto.SensitiveInfoDto> getSensitiveInfo(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        String requesterId = userDetails.getUsername();
        return ResponseEntity.ok(userService.getSensitiveInfo(requesterId, userIdx));
    }

    @Operation(summary = "유저 민감 정보 수정", description = "관리자 전용. 특정 유저의 주민등록번호, 계좌번호, 시급 등을 수정합니다.")
    @PutMapping("/{userIdx}/sensitive-info")
    public ResponseEntity<String> updateSensitiveInfo(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx,
            @RequestBody com.recode.Dwaeji.user.dto.SensitiveInfoDto dto) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }
        String requesterId = userDetails.getUsername();
        userService.updateSensitiveInfo(requesterId, userIdx, dto);
        return ResponseEntity.ok("유저 민감 정보가 성공적으로 업데이트되었습니다.");
    }
    @Operation(summary = "직원 등록 (관리자 전용)", description = "관리자가 새로운 관리자 또는 알바생 계정을 직접 생성합니다. 관리자 전용.")
    @PostMapping("/admin/register")
    public ResponseEntity<java.util.Map<String, Object>> adminRegisterUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody com.recode.Dwaeji.user.dto.AdminRegisterRequestDto dto) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("success", false, "msg", "로그인이 필요합니다."));
        }
        userService.adminRegisterUser(userDetails.getUsername(), dto);
        return ResponseEntity.status(201).body(java.util.Map.of("success", true, "data", "직원이 성공적으로 등록되었습니다."));
    }
    @Operation(summary = "아카이빙된 유저 조회", description = "관리자 전용. 1년 이상 경과하여 아카이빙된 유저 목록을 조회합니다. 조회 시 사유를 반드시 입력해야 합니다.")
    @GetMapping("/admin/archived-workers")
    public ResponseEntity<org.springframework.data.domain.Page<com.recode.Dwaeji.user.dto.ArchivedUserDto>> getArchivedUsers(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String reason,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            jakarta.servlet.http.HttpServletRequest request) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        String ip = request.getRemoteAddr();
        return ResponseEntity.ok(userService.getArchivedUsers(userDetails.getUsername(), reason, ip, page, size));
    }

    @Operation(summary = "아카이빙 유저 영구 삭제", description = "아카이빙된 유저를 DB에서 영구적으로 파기합니다.")
    @DeleteMapping("/admin/archived-workers/{userIdx}")
    public ResponseEntity<String> hardDeleteArchivedUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx) {
        if (userDetails == null) return ResponseEntity.status(401).body("로그인이 필요합니다.");
        userService.hardDeleteArchivedUser(userDetails.getUsername(), userIdx);
        return ResponseEntity.ok("아카이브 데이터가 영구 파기되었습니다.");
    }

    @Operation(summary = "아카이빙 유저 복구(재입사 등)", description = "아카이빙된 유저를 다시 활성 유저로 복구합니다.")
    @PostMapping("/admin/archived-workers/{userIdx}/restore")
    public ResponseEntity<String> restoreArchivedUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userIdx) {
        if (userDetails == null) return ResponseEntity.status(401).body("로그인이 필요합니다.");
        userService.restoreArchivedUser(userDetails.getUsername(), userIdx);
        return ResponseEntity.ok("회원이 복구되었습니다.");
    }
}

