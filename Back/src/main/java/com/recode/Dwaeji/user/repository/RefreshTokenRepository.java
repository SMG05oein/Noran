package com.recode.Dwaeji.user.repository;

import com.recode.Dwaeji.user.database.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByUser_UserIdx(Long userIdx);

    void deleteByUser_UserIdx(Long userIdx);

    Optional<RefreshToken> findByRfToken(String rfToken);
}
