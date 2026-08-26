package com.recode.Dwaeji.user.dto;

import lombok.Builder;

import lombok.AllArgsConstructor;

import lombok.NoArgsConstructor;

import lombok.Setter;

import lombok.Getter;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangePasswordDto {
    private String currentPw;  // 현재 비번 (임시 비번 상태면 임시 비번 입력)
    private String newPw;      // 새 비번
}
