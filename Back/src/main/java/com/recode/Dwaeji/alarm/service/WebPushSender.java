package com.recode.Dwaeji.alarm.service;

import com.recode.Dwaeji.alarm.config.VapidProperties;
import com.recode.Dwaeji.alarm.database.PushSubscriptionEntity;
import com.recode.Dwaeji.alarm.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.security.Security;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebPushSender {

    private final VapidProperties vapidProperties;
    private final PushSubscriptionRepository pushSubscriptionRepository;

    private PushService pushService;

    @PostConstruct
    void init() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        if (!vapidProperties.isConfigured()) {
            log.warn("VAPID keys are not configured. Web push sending is disabled.");
            return;
        }
        try {
            pushService = new PushService(
                    vapidProperties.getPublicKey(),
                    vapidProperties.getPrivateKey(),
                    vapidProperties.getSubject()
            );
        } catch (Exception e) {
            log.error("Failed to initialize Web Push service", e);
            pushService = null;
        }
    }

    public boolean isReady() {
        return pushService != null;
    }

    public String publicKey() {
        return vapidProperties.getPublicKey();
    }

    /**
     * 푸시 발송. 트랜잭션에 묶지 않아 발송/만료삭제 실패가 API 트랜잭션을 rollback-only로 만들지 않음.
     */
    public void sendToUserSubscriptions(Collection<PushSubscriptionEntity> subscriptions, String payloadJson) {
        if (!isReady() || subscriptions == null || subscriptions.isEmpty()) {
            return;
        }
        List<Long> expiredIds = new ArrayList<>();
        for (PushSubscriptionEntity sub : subscriptions) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payloadJson.getBytes(java.nio.charset.StandardCharsets.UTF_8)
                );
                // Chrome 등 최신 브라우저는 AES128GCM
                var response = pushService.send(notification, Encoding.AES128GCM);
                int status = response.getStatusLine().getStatusCode();
                if (status == 404 || status == 410) {
                    log.info("Expired push subscription psIdx={} status={}", sub.getPsIdx(), status);
                    expiredIds.add(sub.getPsIdx());
                } else if (status >= 400) {
                    log.warn("Web push failed psIdx={} status={}", sub.getPsIdx(), status);
                }
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "";
                if (msg.contains("410") || msg.contains("404")) {
                    expiredIds.add(sub.getPsIdx());
                }
                log.warn("Web push send error psIdx={}: {}", sub.getPsIdx(), e.toString());
            }
        }
        for (Long id : expiredIds) {
            if (id == null) {
                continue;
            }
            try {
                pushSubscriptionRepository.deleteById(id);
            } catch (Exception e) {
                log.warn("Failed to delete expired subscription psIdx={}: {}", id, e.toString());
            }
        }
    }
}
