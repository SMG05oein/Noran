package com.recode.Dwaeji.common.exception;

import com.recode.Dwaeji.common.dto.ErrorResponseDto;
import com.recode.Dwaeji.common.util.ClientPageResolver;
import com.recode.Dwaeji.developer.exception.DevIpOtpRequiredException;
import com.recode.Dwaeji.developer.service.SystemMonitorService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final SystemMonitorService systemMonitorService;

    private String getClientIp(HttpServletRequest request) {
        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isEmpty() || "unknown".equalsIgnoreCase(clientIp)) {
            clientIp = request.getRemoteAddr();
        }
        return clientIp;
    }

    private String getReferer(HttpServletRequest request) {
        return ClientPageResolver.resolve(request);
    }

    private String getAuthIdentifier() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            return auth.getName();
        }
        return "로그인 전";
    }

    /**
     * 로그인 자격증명 통과 후 IP 미일치 → OTP 필요 (필터와 동일 body)
     */
    @ExceptionHandler(DevIpOtpRequiredException.class)
    public ResponseEntity<Map<String, Object>> handleDevIpOtpRequired(DevIpOtpRequiredException ex, HttpServletRequest request) {
        systemMonitorService.addErrorLog(
                ex.getMessage(),
                "DevIpOtpRequiredException",
                request.getRequestURL().toString(),
                request.getRequestURI(),
                getAuthIdentifier(),
                HttpStatus.FORBIDDEN.value(),
                getReferer(request),
                getClientIp(request)
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ex.getBody());
    }

    // 우리가 서비스 로직에서 던지는 ResponseStatusException을 잡아냅니다. (예: "아이디 또는 비밀번호가 잘못되었습니다.")
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponseDto> handleResponseStatusException(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        String errorName = (status != null) ? status.getReasonPhrase() : "Unknown Error";

        systemMonitorService.addErrorLog(
                ex.getReason(),
                "ResponseStatusException",
                request.getRequestURL().toString(),
                request.getRequestURI(),
                getAuthIdentifier(),
                ex.getStatusCode().value(),
                getReferer(request),
                getClientIp(request)
        );

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(new ErrorResponseDto(ex.getStatusCode().value(), errorName, ex.getReason()));
    }

    // 필수 요청 파라미터 누락 예외 처리 (400)
    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponseDto> handleMissingServletRequestParameterException(org.springframework.web.bind.MissingServletRequestParameterException ex, HttpServletRequest request) {
        systemMonitorService.addErrorLog(
                ex.getMessage(),
                "MissingServletRequestParameterException",
                request.getRequestURL().toString(),
                request.getRequestURI(),
                getAuthIdentifier(),
                HttpStatus.BAD_REQUEST.value(),
                getReferer(request),
                getClientIp(request)
        );
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        "필수 요청 파라미터가 누락되었습니다: " + ex.getParameterName()
                ));
    }

    // 요청 파라미터 또는 경로 변수 타입 불일치 예외 처리 (400)
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponseDto> handleMethodArgumentTypeMismatchException(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String msg = "잘못된 접근입니다. (관리자에게 문의하세요)";
        systemMonitorService.addErrorLog(
                ex.getMessage(),
                "MethodArgumentTypeMismatchException",
                request.getRequestURL().toString(),
                request.getRequestURI(),
                getAuthIdentifier(),
                HttpStatus.BAD_REQUEST.value(),
                getReferer(request),
                getClientIp(request)
        );
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        msg
                ));
    }

    // JSON 파싱 에러(잘못된 날짜/시간 형식 등)를 잡아냅니다.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponseDto> handleHttpMessageNotReadableException(HttpMessageNotReadableException ex, HttpServletRequest request) {
        systemMonitorService.addErrorLog(
                ex.getMessage(),
                "HttpMessageNotReadableException",
                request.getRequestURL().toString(),
                request.getRequestURI(),
                getAuthIdentifier(),
                HttpStatus.BAD_REQUEST.value(),
                getReferer(request),
                getClientIp(request)
        );
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        "잘못된 데이터 형식입니다."
                ));
    }

    // @Valid 검증 실패 예외 처리
    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDto> handleValidationExceptions(org.springframework.web.bind.MethodArgumentNotValidException ex, HttpServletRequest request) {
        String errorMessage = ex.getBindingResult()
                .getAllErrors()
                .get(0)
                .getDefaultMessage();

        systemMonitorService.addErrorLog(
                errorMessage,
                "MethodArgumentNotValidException",
                request.getRequestURL().toString(),
                request.getRequestURI(),
                getAuthIdentifier(),
                HttpStatus.BAD_REQUEST.value(),
                getReferer(request),
                getClientIp(request)
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        errorMessage
                ));
    }

    // DB 제약조건 위반 (중복 / FK / NOT NULL 등) → 구체적인 사유와 함께 409
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponseDto> handleDataIntegrityViolation(
            org.springframework.dao.DataIntegrityViolationException ex, HttpServletRequest request) {
        Throwable root = ex.getMostSpecificCause();
        String raw = root != null && root.getMessage() != null ? root.getMessage() : "";
        String lower = raw.toLowerCase();
        String message;
        if (lower.contains("duplicate")) {
            message = "이미 등록된 데이터와 중복되어 저장할 수 없습니다. (중복 근무기록 또는 중복 사용자 정보) 엑셀 내용을 확인해 주세요.";
        } else if (lower.contains("foreign key") || lower.contains("cannot add or update a child row")
                || lower.contains("cannot delete or update a parent row")) {
            message = "연결된 데이터(직원/근무지)가 존재하지 않아 저장할 수 없습니다. 직원 및 근무지 등록 상태를 확인해 주세요.";
        } else if (lower.contains("cannot be null") || lower.contains("not-null") || lower.contains("doesn't have a default value")) {
            message = "필수 값이 누락되어 저장할 수 없습니다. 엑셀의 비어 있는 항목을 확인해 주세요.";
        } else if (lower.contains("data too long")) {
            message = "입력 값이 허용 길이를 초과하여 저장할 수 없습니다. 엑셀 내용을 확인해 주세요.";
        } else {
            message = "데이터 제약조건 위반으로 저장에 실패했습니다. 엑셀 내용을 확인해 주세요.";
        }

        systemMonitorService.addErrorLog(
                raw,
                "DataIntegrityViolationException",
                request.getRequestURL().toString(),
                request.getRequestURI(),
                getAuthIdentifier(),
                HttpStatus.CONFLICT.value(),
                getReferer(request),
                getClientIp(request)
        );
        log.warn("[409 DataIntegrity] {}", raw);

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponseDto(HttpStatus.CONFLICT.value(), HttpStatus.CONFLICT.getReasonPhrase(), message));
    }

    // 트랜잭션 커밋 단계에서 감싸져 올라온 제약조건 위반 처리
    @ExceptionHandler(org.springframework.transaction.TransactionSystemException.class)
    public ResponseEntity<ErrorResponseDto> handleTransactionSystemException(
            org.springframework.transaction.TransactionSystemException ex, HttpServletRequest request) {
        Throwable root = ex.getMostSpecificCause();
        if (root instanceof java.sql.SQLIntegrityConstraintViolationException) {
            return handleDataIntegrityViolation(
                    new org.springframework.dao.DataIntegrityViolationException(root.getMessage(), root), request);
        }
        return handleAllExceptions(ex, request);
    }

    // 예측하지 못한 서버 내부 오류 (500)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleAllExceptions(Exception ex, HttpServletRequest request) {
        systemMonitorService.addErrorLog(
                ex.getMessage(),
                ex.getClass().getSimpleName(),
                request.getRequestURL().toString(),
                request.getRequestURI(),
                getAuthIdentifier(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                getReferer(request),
                getClientIp(request)
        );

        log.error("[500 Internal Error] {} - {}", ex.getClass().getSimpleName(), ex.getMessage(), ex);

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponseDto(
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                        "서버 내부 오류가 발생했습니다."
                ));
    }
}
