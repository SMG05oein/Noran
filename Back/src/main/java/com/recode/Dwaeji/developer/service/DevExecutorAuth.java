package com.recode.Dwaeji.developer.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DevExecutorAuth {

    @Value("${db.executor.id}")
    private String executorId;

    @Value("${db.executor.pw}")
    private String executorPw;

    public void require(String id, String pw) {
        if (id == null || pw == null || !id.equals(executorId) || !pw.equals(executorPw)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "실행기 권한이 없습니다. (ID/PW 불일치)");
        }
    }

    public String executorId() {
        return executorId;
    }
}
