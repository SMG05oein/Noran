package com.recode.Dwaeji.user.dto;

import com.recode.Dwaeji.user.database.Bank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankDto {
    private String bankCode;
    private String bankName;
    private Integer sortOrder;

    public static BankDto fromEntity(Bank bank) {
        if (bank == null) return null;
        return BankDto.builder()
                .bankCode(bank.getBankCode())
                .bankName(bank.getBankName())
                .sortOrder(bank.getSortOrder())
                .build();
    }
}
