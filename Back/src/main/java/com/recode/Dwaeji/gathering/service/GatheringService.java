package com.recode.Dwaeji.gathering.service;

import com.recode.Dwaeji.gathering.dto.*;

import java.util.List;

public interface GatheringService {

    // 이용규정
    GatheringRulesStatusResponseDto getRulesStatus(String username);
    void agreeRules(String username);

    // 태그
    List<GatheringTagResponseDto> getAllTags();
    GatheringTagResponseDto createTag(GatheringTagCreateRequestDto requestDto);
    GatheringTagResponseDto updateTag(Integer tagId, GatheringTagUpdateRequestDto requestDto, String username);
    void deleteTag(Integer tagId, String username);

    // 게시글
    List<GatheringPostResponseDto> getPosts(Integer tagId, Boolean myOnly, Long targetUserIdx, String keyword, Boolean includeDeleted, Boolean unmask, Integer page, Integer size, String username);
    GatheringPostResponseDto getPost(Long postId, String username);
    GatheringPostResponseDto createPost(GatheringPostCreateRequestDto requestDto, String username);
    GatheringPostResponseDto updatePost(Long postId, GatheringPostUpdateRequestDto requestDto, String username);
    void deletePost(Long postId, String username);
    void restorePost(Long postId, String username);
    void reportPost(Long postId, GatheringReportRequestDto requestDto, String username);

    // 댓글
    List<GatheringCommentResponseDto> getComments(Long postId, String username);
    GatheringCommentResponseDto createComment(Long postId, GatheringCommentCreateRequestDto requestDto, String username);
    void deleteComment(Long commentId, String username);
    void reportComment(Long commentId, GatheringReportRequestDto requestDto, String username);

    // 관리자 기능 (신고 관리 & 실명 열람)
    List<GatheringReportResponseDto> getReports(String status, Integer page, Integer size, String username);
    void updateReportStatus(Long reportId, GatheringReportStatusUpdateRequestDto requestDto, String username);
    GatheringUnmaskResponseDto unmaskRealAuthor(GatheringUnmaskRequestDto requestDto, String username);
    GatheringAdminUnmaskResponseDto adminUnmask(GatheringAdminUnmaskRequestDto requestDto, String username);
}
