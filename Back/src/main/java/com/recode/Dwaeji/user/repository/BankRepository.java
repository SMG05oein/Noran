package com.recode.Dwaeji.user.repository;

import com.recode.Dwaeji.user.database.Bank;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BankRepository extends JpaRepository<Bank, String> {
    List<Bank> findByIsActiveOrderBySortOrderAscBankNameAsc(Integer isActive);
    Optional<Bank> findByBankName(String bankName);
}
