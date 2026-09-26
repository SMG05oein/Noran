package com.recode.Dwaeji.gathering.repository;

import com.recode.Dwaeji.gathering.database.GatheringComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GatheringCommentRepository extends JpaRepository<GatheringComment, Long> {

    @Query("SELECT c FROM GatheringComment c " +
            "JOIN FETCH c.user u " +
            "WHERE c.post.postId = :postId " +
            "AND c.isDeleted = false " +
            "ORDER BY c.createdAt ASC")
    List<GatheringComment> findByPostIdWithUser(@Param("postId") Long postId);

    long countByPost_PostIdAndIsDeletedFalse(Long postId);

    Optional<GatheringComment> findByCommentIdAndIsDeletedFalse(Long commentId);
    void deleteByUser_UserIdx(Long userIdx);
    void deleteByPost_User_UserIdx(Long userIdx);
}
