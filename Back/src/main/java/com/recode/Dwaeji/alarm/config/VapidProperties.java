package com.recode.Dwaeji.alarm.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "vapid")
public class VapidProperties {
    /** URL-safe base64 public key */
    private String publicKey = "";
    /** URL-safe base64 private key */
    private String privateKey = "";
    /** mailto: or https: contact URI */
    private String subject = "mailto:admin@dwaeji.kr";

    public boolean isConfigured() {
        return publicKey != null && !publicKey.isBlank()
                && privateKey != null && !privateKey.isBlank();
    }
}
