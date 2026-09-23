package com.recode.Dwaeji.user.service;

import com.recode.Dwaeji.user.database.ArchivedUser;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.ArchivedUserRepository;
import com.recode.Dwaeji.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserArchiveScheduler {

    private final UserRepository userRepository;
    private final ArchivedUserRepository archivedUserRepository;

    // 테스트를 위해 10초마다 실행되도록 변경
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void runArchiving() {
        log.info("퇴사자 아카이빙 및 비식별화 배치 작업 시작...");

        LocalDateTime oneYearAgo = LocalDateTime.now().minusYears(1);
        List<User> usersToArchive = userRepository.findUsersToArchive(oneYearAgo);

        int count = 0;
        for (User user : usersToArchive) {
            try {
                // 1. ArchivedUser 에 복사
                ArchivedUser archivedUser = ArchivedUser.builder()
                        .originalUserIdx(user.getUserIdx())
                        .userId(user.getUserId())
                        .userName(user.getUserName())
                        .userEmail(user.getUserEmail())
                        .userPhone(user.getUserPhone())
                        .userBirth(user.getUserBirth())
                        .userAccountNumber(user.getUserAccountNumber())
                        .userAccountName(user.getUserAccountName())
                        .userBank(user.getUserBank())
                        .withdrawnAt(user.getUserWithdrawnAt())
                        .archivedAt(LocalDateTime.now())
                        // 정책에 따라 아카이브된 데이터는 4년 뒤 완전 파기 (퇴사 기준 5년)
                        .destroyDueAt(LocalDateTime.now().plusYears(4))
                        .build();
                archivedUserRepository.save(archivedUser);

                // 2. 기존 User 비식별화 (마스킹)
                user.setUserId("deleted_" + user.getUserIdx());
                user.setUserName("탈퇴자_비식별화");
                user.setUserPhone(null);
                user.setUserEmail(null);
                user.setUserBirth(null);
                user.setUserAccountNumber(null);
                user.setUserAccountName(null);
                user.setUserBank(null);
                user.setUserIsTempPw(0);
                user.setUserTempPw(null);
                user.setBankConsentAgreed(false);
                user.setEmailConsentAgreed(false);
                
                userRepository.save(user);
                count++;
            } catch (Exception e) {
                log.error("유저 아카이빙 중 오류 발생: userIdx={}", user.getUserIdx(), e);
            }
        }

        log.info("퇴사자 아카이빙 배치 완료. 총 {}명 처리됨.", count);
        
        // 3. destroyDueAt 이 지난 아카이브 완전 파기
        List<ArchivedUser> usersToDestroy = archivedUserRepository.findByDestroyDueAtBefore(LocalDateTime.now());
        if (!usersToDestroy.isEmpty()) {
            archivedUserRepository.deleteAll(usersToDestroy);
            log.info("보존 기간(최대 5년)이 경과한 아카이브 유저 {}명 완전 파기 완료.", usersToDestroy.size());
        }
    }
}
