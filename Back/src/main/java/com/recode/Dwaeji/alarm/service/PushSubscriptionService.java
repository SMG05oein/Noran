package com.recode.Dwaeji.alarm.service;

import com.recode.Dwaeji.alarm.database.PushSubscriptionEntity;
import com.recode.Dwaeji.alarm.dto.PushSubscriptionRequestDto;
import com.recode.Dwaeji.alarm.repository.PushSubscriptionRepository;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PushSubscriptionService {

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final UserRepository userRepository;

    @Transactional
    public void upsert(String userId, PushSubscriptionRequestDto dto, String userAgent) {
        User user = requireUser(userId);
        if (dto.getEndpoint() == null || dto.getEndpoint().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endpoint는 필수입니다.");
        }
        if (dto.getKeys() == null || dto.getKeys().getP256dh() == null || dto.getKeys().getAuth() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "keys.p256dh / keys.auth는 필수입니다.");
        }

        PushSubscriptionEntity entity = pushSubscriptionRepository.findByEndpoint(dto.getEndpoint())
                .orElseGet(PushSubscriptionEntity::new);

        // 다른 계정에 묶인 endpoint면 현재 계정으로 이전(기기 재로그인)
        entity.setUser(user);
        entity.setEndpoint(dto.getEndpoint());
        entity.setP256dh(dto.getKeys().getP256dh());
        entity.setAuth(dto.getKeys().getAuth());
        if (userAgent != null && userAgent.length() > 512) {
            entity.setUserAgent(userAgent.substring(0, 512));
        } else {
            entity.setUserAgent(userAgent);
        }
        pushSubscriptionRepository.save(entity);
    }

    @Transactional
    public void deleteByEndpoint(String userId, String endpoint) {
        User user = requireUser(userId);
        if (endpoint == null || endpoint.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endpoint는 필수입니다.");
        }
        pushSubscriptionRepository.deleteByUser_UserIdxAndEndpoint(user.getUserIdx(), endpoint);
    }

    @Transactional
    public void deleteAllForUser(String userId) {
        User user = requireUser(userId);
        pushSubscriptionRepository.deleteByUser_UserIdx(user.getUserIdx());
    }

    private User requireUser(String userId) {
        return userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다."));
    }
}
