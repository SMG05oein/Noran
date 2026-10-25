package com.recode.Dwaeji.alarm.service;

import com.recode.Dwaeji.alarm.config.VapidProperties;
import com.recode.Dwaeji.alarm.database.PushSubscriptionEntity;
import com.recode.Dwaeji.alarm.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jose4j.lang.JoseException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.Collection;
import java.util.concurrent.ExecutionException;

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
        } catch (GeneralSecurityException e) {
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

    @Transactional
    public void sendToUserSubscriptions(Collection<PushSubscriptionEntity> subscriptions, String payloadJson) {
        if (!isReady() || subscriptions == null || subscriptions.isEmpty()) {
            return;
        }
        for (PushSubscriptionEntity sub : subscriptions) {
            sendOne(sub, payloadJson);
        }
    }

    private void sendOne(PushSubscriptionEntity sub, String payloadJson) {
        try {
            Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    payloadJson.getBytes(java.nio.charset.StandardCharsets.UTF_8)
            );
            var response = pushService.send(notification);
            int status = response.getStatusLine().getStatusCode();
            if (status == 404 || status == 410) {
                log.info("Removing expired push subscription psIdx={} status={}", sub.getPsIdx(), status);
                pushSubscriptionRepository.delete(sub);
            } else if (status >= 400) {
                log.warn("Web push failed psIdx={} status={}", sub.getPsIdx(), status);
            }
        } catch (GeneralSecurityException | IOException | JoseException | ExecutionException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            // Some browsers return gone via exception message; best-effort delete on known gone patterns
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("410") || msg.contains("404")) {
                pushSubscriptionRepository.delete(sub);
            }
            log.warn("Web push send error psIdx={}: {}", sub.getPsIdx(), e.toString());
        }
    }
}
