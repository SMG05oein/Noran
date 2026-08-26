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
public class TempPasswordRequestDto {
    private String tempPw;
}
