package com.recode.Dwaeji.joke.repository;

import com.recode.Dwaeji.joke.database.Joke;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JokeRepository extends JpaRepository<Joke, Long> {

    @Query(value = "SELECT j FROM Joke j " +
            "JOIN FETCH j.user u " +
            "WHERE j.isDeleted = false " +
            "AND (:userIdx IS NULL OR u.userIdx = :userIdx) " +
            "AND (:keyword IS NULL OR :keyword = '' " +
            "     OR j.setup LIKE %:keyword% " +
            "     OR j.punchline LIKE %:keyword% " +
            "     OR j.situation LIKE %:keyword% " +
            "     OR (j.detail IS NOT NULL AND j.detail LIKE %:keyword%)) " +
            "ORDER BY j.createdAt DESC",
            countQuery = "SELECT COUNT(j) FROM Joke j " +
                    "WHERE j.isDeleted = false " +
                    "AND (:userIdx IS NULL OR j.user.userIdx = :userIdx) " +
                    "AND (:keyword IS NULL OR :keyword = '' " +
                    "     OR j.setup LIKE %:keyword% " +
                    "     OR j.punchline LIKE %:keyword% " +
                    "     OR j.situation LIKE %:keyword% " +
                    "     OR (j.detail IS NOT NULL AND j.detail LIKE %:keyword%))")
    Page<Joke> findJokesWithFilter(
            @Param("userIdx") Long userIdx,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("SELECT j FROM Joke j JOIN FETCH j.user u WHERE j.isDeleted = false ORDER BY j.createdAt DESC")
    List<Joke> findAllActiveJokes();

    Optional<Joke> findByJokeIdAndIsDeletedFalse(Long jokeId);
}
