package com.recode.Dwaeji.user.repository;

import com.recode.Dwaeji.user.database.WorkPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkPlaceRepository extends JpaRepository<WorkPlace, Long> {
}
