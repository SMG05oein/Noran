package com.recode.Dwaeji.common.converter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class AesCryptoUtil {

    @Value("${aes.secret-key}")
    private String injectedKey;

    private static String SECRET_KEY;
    private static final String ALGORITHM = "AES/ECB/PKCS5Padding"; // ECB for simplicity in this demo, though CBC is better

    @PostConstruct
    public void init() {
        SECRET_KEY = injectedKey;
        // 패딩 처리 (32바이트 맞추기 위해 잘라내거나 0으로 채움)
        if (SECRET_KEY != null && SECRET_KEY.length() < 32) {
            SECRET_KEY = String.format("%-32s", SECRET_KEY).replace(' ', '0');
        } else if (SECRET_KEY != null && SECRET_KEY.length() > 32) {
            SECRET_KEY = SECRET_KEY.substring(0, 32);
        }
    }

    public static String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) return plainText;
        try {
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(StandardCharsets.UTF_8), "AES");
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public static String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) return encryptedText;
        try {
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(StandardCharsets.UTF_8), "AES");
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey);
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
