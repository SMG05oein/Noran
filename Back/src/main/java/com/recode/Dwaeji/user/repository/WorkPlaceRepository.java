package com.recode.Dwaeji.user.repository;

import com.recode.Dwaeji.user.database.WorkPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkPlaceRepository extends JpaRepository<WorkPlace, Long> {
    @org.springframework.data.jpa.repository.Query("SELECT w FROM WorkPlace w WHERE w.wpIsActive = 1 OR w.wpIsActive IS NULL")
    List<WorkPlace> findAllActive();
}
