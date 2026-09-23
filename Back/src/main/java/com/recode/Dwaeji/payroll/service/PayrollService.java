package com.recode.Dwaeji.payroll.service;

import com.recode.Dwaeji.payroll.dto.PayrollRowDto;
import org.springframework.data.domain.Page;

public interface PayrollService {

    Page<PayrollRowDto> getPayrollList(
            String requesterId,
            int year,
            int month,
            Long workPlaceIdx,
            String userName,
            int page,
            int size,
            String sortBy,
            String sortDir);

    byte[] downloadExcel(String requesterId, int year, int month, Long workPlaceIdx);
}
