package com.recode.Dwaeji.user.config;

import com.recode.Dwaeji.user.database.Bank;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.BankRepository;
import com.recode.Dwaeji.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class BankDataInitializer implements ApplicationRunner {

    private final BankRepository bankRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Map<String, String> seeds = new LinkedHashMap<>();
        seeds.put("004", "국민은행");
        seeds.put("088", "신한은행");
        seeds.put("020", "우리은행");
        seeds.put("081", "하나은행");
        seeds.put("011", "농협은행");
        seeds.put("003", "기업은행");
        seeds.put("023", "SC제일은행");
        seeds.put("027", "씨티은행");
        seeds.put("071", "우체국");
        seeds.put("045", "새마을금고");
        seeds.put("048", "신협");
        seeds.put("031", "대구은행");
        seeds.put("032", "부산은행");
        seeds.put("034", "광주은행");
        seeds.put("037", "전북은행");
        seeds.put("039", "경남은행");
        seeds.put("035", "제주은행");
        seeds.put("089", "케이뱅크");
        seeds.put("090", "카카오뱅크");
        seeds.put("092", "토스뱅크");

        int order = 1;
        for (Map.Entry<String, String> e : seeds.entrySet()) {
            if (!bankRepository.existsById(e.getKey())) {
                bankRepository.save(Bank.builder()
                        .bankCode(e.getKey())
                        .bankName(e.getValue())
                        .sortOrder(order)
                        .isActive(1)
                        .build());
            }
            order++;
        }

        // 기존 한글 은행명 → 코드 마이그레이션
        Map<String, String> nameToCode = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : seeds.entrySet()) {
            nameToCode.put(e.getValue(), e.getKey());
        }
        List<User> users = userRepository.findAll();
        int migrated = 0;
        for (User u : users) {
            String bank = u.getUserBank();
            if (bank == null || bank.isBlank()) continue;
            if (nameToCode.containsKey(bank)) {
                u.setUserBank(nameToCode.get(bank));
                migrated++;
            }
        }
        if (migrated > 0) {
            userRepository.saveAll(users);
            log.info("은행명→코드 마이그레이션 {}건 완료", migrated);
        }
    }
}
