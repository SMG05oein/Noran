package com.recode.Dwaeji.common.exception;

import com.recode.Dwaeji.common.dto.ErrorResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 우리가 서비스 로직에서 던지는 ResponseStatusException을 잡아냅니다. (예: "아이디 또는 비밀번호가 잘못되었습니다.")
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponseDto> handleResponseStatusException(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        String errorName = (status != null) ? status.getReasonPhrase() : "Unknown Error";
        
        return ResponseEntity
                .status(ex.getStatusCode())
                .body(new ErrorResponseDto(ex.getStatusCode().value(), errorName, ex.getReason()));
    }

    // JSON 파싱 에러(잘못된 날짜/시간 형식 등)를 잡아냅니다.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponseDto> handleHttpMessageNotReadableException(HttpMessageNotReadableException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(
                        HttpStatus.BAD_REQUEST.value(), 
                        HttpStatus.BAD_REQUEST.getReasonPhrase(), 
                        "잘못된 데이터 형식입니다."
                ));
    }
}
