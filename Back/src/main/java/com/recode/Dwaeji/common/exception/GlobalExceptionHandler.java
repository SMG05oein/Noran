package com.recode.Dwaeji.common.exception;

import com.recode.Dwaeji.common.dto.ErrorResponseDto;
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
        String referer = request.getHeader("Referer");
        if (referer == null || referer.isEmpty()) {
            referer = request.getHeader("Origin");
        }
        return referer != null ? referer : "알 수 없음";
    }

    private String getAuthIdentifier() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            return auth.getName();
        }
        return "로그인 전";
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
