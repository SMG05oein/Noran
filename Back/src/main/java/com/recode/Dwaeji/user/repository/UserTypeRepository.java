package com.recode.Dwaeji.user.repository;

import com.recode.Dwaeji.user.database.UserType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserTypeRepository extends JpaRepository<UserType, Long> {
}
