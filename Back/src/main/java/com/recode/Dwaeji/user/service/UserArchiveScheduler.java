package com.recode.Dwaeji.user.service;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.RefreshTokenRepository;
import com.recode.Dwaeji.user.repository.UserRepository;
import com.recode.Dwaeji.work_record.repository.WorkRecordHistoryRepository;
import com.recode.Dwaeji.work_record.repository.WorkRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.recode.Dwaeji.gathering.repository.GatheringCommentRepository;
import com.recode.Dwaeji.gathering.repository.GatheringPostRepository;
import com.recode.Dwaeji.gathering.repository.GatheringReportRepository;
import com.recode.Dwaeji.joke.repository.JokeRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyDailyRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkApplyRepository;
import com.recode.Dwaeji.work_apply_work.repository.WorkScheduleDailyRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserArchiveScheduler {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final WorkRecordRepository workRecordRepository;
    private final WorkRecordHistoryRepository workRecordHistoryRepository;
    private final WorkApplyRepository workApplyRepository;
    private final WorkApplyDailyRepository workApplyDailyRepository;
    private final WorkScheduleDailyRepository workScheduleDailyRepository;
    private final GatheringReportRepository gatheringReportRepository;
    private final GatheringCommentRepository gatheringCommentRepository;
    private final GatheringPostRepository gatheringPostRepository;
    private final JokeRepository jokeRepository;
    @Autowired
    @Lazy
    private UserArchiveScheduler self;

    /**
     * 매일 새벽 3시: 퇴사 후 5년이 경과한 사용자 완전 파기 (영구 삭제)
     * 국세기본법/근로기준법 보존 의무 기간(5년) 만료에 따른 자동 영구 삭제 처리.
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void runArchiving() {
        log.info("퇴사 5년 경과 사용자 자동 완전 파기 배치 작업 시작...");

        LocalDateTime fiveYearsAgo = LocalDateTime.now().minusYears(5);
        List<User> usersToDestroy = userRepository.findUsersWithdrawnBefore(fiveYearsAgo);

        int count = 0;
        for (User user : usersToDestroy) {
            try {
                self.deleteUserInNewTransaction(user);
                count++;
            } catch (Exception e) {
                log.error("5년 경과 유저 자동 파기 중 오류 발생: userIdx={}", user.getUserIdx(), e);
            }
        }


        log.info("퇴사 5년 경과 사용자 자동 파기 완료. 총 {}명 삭제됨.", count);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteUserInNewTransaction(User user) {
        Long userIdx = user.getUserIdx();
        // 연관 자식 데이터 삭제
        refreshTokenRepository.deleteByUser_UserIdx(userIdx);
        workRecordHistoryRepository.deleteByTargetUser_UserIdx(userIdx);
        workRecordHistoryRepository.deleteByAdminUser_UserIdx(userIdx);
        workRecordRepository.deleteByUser_UserIdx(userIdx);

        workApplyDailyRepository.deleteByUser_UserIdx(userIdx);
        workScheduleDailyRepository.deleteByUser_UserIdx(userIdx);
        workApplyRepository.deleteByUser_UserIdx(userIdx);

        gatheringReportRepository.deleteByUser_UserIdx(userIdx);
        gatheringCommentRepository.deleteByUser_UserIdx(userIdx);
        gatheringCommentRepository.deleteByPost_User_UserIdx(userIdx);
        gatheringPostRepository.deleteByUser_UserIdx(userIdx);
        jokeRepository.deleteByUser_UserIdx(userIdx);

        // 사용자 완전 파기
        userRepository.delete(user);
    }

    /**
     * 매일 새벽 3시 30분: 1년이 경과한 수동 영구 삭제 백업 zip 파일 자동 파기
     */
    @Scheduled(cron = "0 30 3 * * *")
    public void cleanUpOldHardDeleteZipFiles() {
        File logDir = new File("logs");
        if (!logDir.exists() || !logDir.isDirectory()) {
            return;
        }

        LocalDate oneYearAgo = LocalDate.now().minusYears(1);
        File[] files = logDir.listFiles((dir, name) -> name.endsWith(".zip"));

        if (files != null) {
            int deleteCount = 0;
            for (File file : files) {
                String name = file.getName();
                if (name.length() >= 10) {
                    try {
                        LocalDate fileDate = LocalDate.parse(name.substring(0, 10));
                        if (fileDate.isBefore(oneYearAgo)) {
                            boolean deleted = file.delete();
                            if (deleted) {
                                deleteCount++;
                            }
                        }
                    } catch (Exception ignored) {
                    }
                }
            }
            if (deleteCount > 0) {
                log.info("1년 경과 영구 삭제 백업 zip 파일 {}개 자동 파기 완료.", deleteCount);
            }
        }
    }
}
