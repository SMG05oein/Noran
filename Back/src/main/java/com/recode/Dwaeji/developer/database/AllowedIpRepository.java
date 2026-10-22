package com.recode.Dwaeji.developer.database;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AllowedIpRepository extends JpaRepository<AllowedIp, Long> {

    List<AllowedIp> findByIpTypeOrderByIpIdxAsc(AllowedIp.Type ipType);

    boolean existsByIpTypeAndIpAddress(AllowedIp.Type ipType, String ipAddress);
}
