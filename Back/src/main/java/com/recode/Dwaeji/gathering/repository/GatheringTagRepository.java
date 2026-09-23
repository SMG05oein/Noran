package com.recode.Dwaeji.gathering.repository;

import com.recode.Dwaeji.gathering.database.GatheringTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GatheringTagRepository extends JpaRepository<GatheringTag, Integer> {
    Optional<GatheringTag> findByName(String name);
    boolean existsByName(String name);
    List<GatheringTag> findAllByOrderByTagIdAsc();
}
