package com.recode.Dwaeji.gathering.repository;

import com.recode.Dwaeji.gathering.database.GatheringPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GatheringPostRepository extends JpaRepository<GatheringPost, Long> {

    @Query(value = "SELECT p FROM GatheringPost p " +
            "JOIN FETCH p.tag t " +
            "JOIN FETCH p.user u " +
            "WHERE (:includeDeleted = true OR p.isDeleted = false) " +
            "AND (:tagId IS NULL OR t.tagId = :tagId) " +
            "AND (:userIdx IS NULL OR u.userIdx = :userIdx) " +
            "AND (:keyword IS NULL OR :keyword = '' OR p.title LIKE %:keyword% OR p.content LIKE %:keyword%) " +
            "ORDER BY p.createdAt DESC",
            countQuery = "SELECT COUNT(p) FROM GatheringPost p " +
                    "WHERE (:includeDeleted = true OR p.isDeleted = false) " +
                    "AND (:tagId IS NULL OR p.tag.tagId = :tagId) " +
                    "AND (:userIdx IS NULL OR p.user.userIdx = :userIdx) " +
                    "AND (:keyword IS NULL OR :keyword = '' OR p.title LIKE %:keyword% OR p.content LIKE %:keyword%)")
    Page<GatheringPost> findPostsWithFilter(
            @Param("tagId") Integer tagId,
            @Param("userIdx") Long userIdx,
            @Param("keyword") String keyword,
            @Param("includeDeleted") Boolean includeDeleted,
            Pageable pageable
    );

    Optional<GatheringPost> findByPostIdAndIsDeletedFalse(Long postId);

    boolean existsByUser_UserIdxAndIsDeletedFalse(Long userIdx);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE GatheringPost p SET p.tag = :defaultTag WHERE p.tag = :targetTag")
    int updateTagByTag(
            @Param("targetTag") com.recode.Dwaeji.gathering.database.GatheringTag targetTag,
            @Param("defaultTag") com.recode.Dwaeji.gathering.database.GatheringTag defaultTag
    );
}
