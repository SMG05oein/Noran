package com.recode.Dwaeji.gathering.impl;

import com.recode.Dwaeji.gathering.database.*;
import com.recode.Dwaeji.gathering.dto.*;
import com.recode.Dwaeji.gathering.repository.*;
import com.recode.Dwaeji.gathering.service.GatheringService;
import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GatheringServiceImpl implements GatheringService {

    private final GatheringTagRepository gatheringTagRepository;
    private final GatheringPostRepository gatheringPostRepository;
    private final GatheringCommentRepository gatheringCommentRepository;
    private final GatheringReportRepository gatheringReportRepository;
    private final GatheringUnmaskLogRepository gatheringUnmaskLogRepository;
    private final UserRepository userRepository;

    private User getRequester(String username) {
        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userRepository.findByUserId(username)
                .orElseGet(() -> userRepository.findByUserEmail(username)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 유효하지 않습니다.")));
    }

    private User getRequesterOptional(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        return userRepository.findByUserId(username)
                .orElseGet(() -> userRepository.findByUserEmail(username).orElse(null));
    }

    private boolean isAdmin(User user) {
        return user != null && user.getUserType() != null && user.getUserType().getUtIsAdmin() != null && user.getUserType().getUtIsAdmin() == 1;
    }

    // ==================== 이용규정 ====================

    @Override
    @Transactional(readOnly = true)
    public GatheringRulesStatusResponseDto getRulesStatus(String username) {
        User user = getRequester(username);
        boolean hasWritten = gatheringPostRepository.existsByUser_UserIdxAndIsDeletedFalse(user.getUserIdx());
        return GatheringRulesStatusResponseDto.builder()
                .hasWritten(hasWritten)
                .hasAgreedGatheringRules(hasWritten)
                .build();
    }

    @Override
    @Transactional
    public void agreeRules(String username) {
        // 기존 작성 글 존재 여부로 자동 판별되므로 별도의 User 컬럼 변경 없이 인증 검증 후 성공 응답
        getRequester(username);
    }

    // ==================== 태그 ====================

    @Override
    @Transactional(readOnly = true)
    public List<GatheringTagResponseDto> getAllTags() {
        return gatheringTagRepository.findAllByOrderByTagIdAsc().stream()
                .map(GatheringTagResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GatheringTagResponseDto createTag(GatheringTagCreateRequestDto requestDto) {
        if (gatheringTagRepository.existsByName(requestDto.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 존재하는 태그명입니다.");
        }

        GatheringTag tag = GatheringTag.builder()
                .name(requestDto.getName())
                .emojiIdx(requestDto.getEmojiIdx() != null ? requestDto.getEmojiIdx() : 0)
                .build();

        GatheringTag saved = gatheringTagRepository.save(tag);
        return GatheringTagResponseDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public GatheringTagResponseDto updateTag(Integer tagId, GatheringTagUpdateRequestDto requestDto, String username) {
        User requester = getRequester(username);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "태그 수정은 관리자만 가능합니다.");
        }

        GatheringTag tag = gatheringTagRepository.findById(tagId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 태그를 찾을 수 없습니다."));

        if (!tag.getName().equals(requestDto.getName()) && gatheringTagRepository.existsByName(requestDto.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 존재하는 태그명입니다.");
        }

        tag.setName(requestDto.getName());
        if (requestDto.getEmojiIdx() != null) {
            tag.setEmojiIdx(requestDto.getEmojiIdx());
        }
        GatheringTag updated = gatheringTagRepository.save(tag);
        return GatheringTagResponseDto.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteTag(Integer tagId, String username) {
        User requester = getRequester(username);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "태그 삭제는 관리자만 가능합니다.");
        }

        if (Integer.valueOf(1).equals(tagId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기본 카테고리 태그('일상썰')는 삭제할 수 없습니다.");
        }

        GatheringTag targetTag = gatheringTagRepository.findById(tagId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 태그를 찾을 수 없습니다."));

        GatheringTag defaultTag = gatheringTagRepository.findById(1)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "기본 태그(1번)를 찾을 수 없습니다."));

        // 삭제 대상 태그를 참조하는 게시글들을 기본 태그(1번)로 일괄 이전 (FK 제약조건 위반 방어)
        gatheringPostRepository.updateTagByTag(targetTag, defaultTag);

        gatheringTagRepository.delete(targetTag);
    }

    // ==================== 게시글 ====================

    @Override
    @Transactional
    public List<GatheringPostResponseDto> getPosts(Integer tagId, Boolean myOnly, Long targetUserIdx, String keyword, Boolean includeDeleted, Boolean unmask, Integer page, Integer size, String username) {
        User currentUser = getRequesterOptional(username);

        // unmask=true 는 관리자만 허용
        boolean doUnmask = Boolean.TRUE.equals(unmask);
        if (doUnmask) {
            if (!isAdmin(currentUser)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "실명 열람 권한이 없습니다. (관리자 전용)");
            }
        }

        Long filterUserIdx = null;
        if (Boolean.TRUE.equals(myOnly)) {
            if (currentUser == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
            }
            filterUserIdx = currentUser.getUserIdx();
        } else if (targetUserIdx != null) {
            filterUserIdx = targetUserIdx;
        }

        // 관리자만 includeDeleted=true 허용
        boolean allowIncludeDeleted = Boolean.TRUE.equals(includeDeleted) && isAdmin(currentUser);

        int pageNum = (page != null && page >= 0) ? page : 0;
        int pageSize = (size != null && size > 0) ? size : 100;
        Pageable pageable = PageRequest.of(pageNum, pageSize);
        Page<GatheringPost> postPage = gatheringPostRepository.findPostsWithFilter(
                tagId,
                filterUserIdx,
                (keyword != null && !keyword.isBlank()) ? keyword.trim() : null,
                allowIncludeDeleted,
                pageable
        );

        List<GatheringPost> posts = postPage.getContent();

        if (doUnmask) {
            // 익명 글 대상 감사 로그 일괄 저장
            String adminId = currentUser.getUserId();
            List<GatheringUnmaskLog> logs = posts.stream()
                    .filter(post -> Boolean.TRUE.equals(post.getIsAnonymous()) && post.getUser() != null)
                    .map(post -> GatheringUnmaskLog.builder()
                            .adminId(adminId)
                            .targetType("POST")
                            .targetId(post.getPostId())
                            .targetUserId(post.getUser().getUserId())
                            .reason("관리자_익명열람")
                            .viewedAt(java.time.LocalDateTime.now())
                            .build())
                    .collect(Collectors.toList());

            if (!logs.isEmpty()) {
                gatheringUnmaskLogRepository.saveAll(logs);
            }

            // 실명 응답 (canViewRealAuthor = true)
            return posts.stream().map(post -> {
                long commentCount = gatheringCommentRepository.countByPost_PostIdAndIsDeletedFalse(post.getPostId());
                return GatheringPostResponseDto.fromEntity(post, commentCount, true);
            }).collect(Collectors.toList());
        }

        // 일반 조회: 준익명제 원칙 (관리자라도 본인 글 외 익명 마스킹)
        return posts.stream().map(post -> {
            long commentCount = gatheringCommentRepository.countByPost_PostIdAndIsDeletedFalse(post.getPostId());
            boolean canViewRealAuthor = currentUser != null && post.getUser().getUserIdx().equals(currentUser.getUserIdx());
            return GatheringPostResponseDto.fromEntity(post, commentCount, canViewRealAuthor);
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public GatheringPostResponseDto getPost(Long postId, String username) {
        User currentUser = getRequesterOptional(username);

        GatheringPost post = gatheringPostRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 게시글입니다."));

        if (Boolean.TRUE.equals(post.getIsDeleted()) && !isAdmin(currentUser)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제된 게시글입니다.");
        }

        long commentCount = gatheringCommentRepository.countByPost_PostIdAndIsDeletedFalse(postId);
        // 준익명제 원칙: 관리자라도 기본 조회 시 작성자 본인이 아니면 익명 마스킹
        boolean canViewRealAuthor = currentUser != null && post.getUser().getUserIdx().equals(currentUser.getUserIdx());

        return GatheringPostResponseDto.fromEntity(post, commentCount, canViewRealAuthor);
    }

    @Override
    @Transactional
    public GatheringPostResponseDto createPost(GatheringPostCreateRequestDto requestDto, String username) {
        User user = getRequester(username);

        GatheringTag tag = gatheringTagRepository.findById(requestDto.getTagId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 태그를 찾을 수 없습니다."));

        GatheringPost post = GatheringPost.builder()
                .tag(tag)
                .user(user)
                .authorName(user.getUserName())
                .title(requestDto.getTitle())
                .content(requestDto.getContent())
                .emojiIdx(requestDto.getEmojiIdx() != null ? requestDto.getEmojiIdx() : 0)
                .isAnonymous(Boolean.TRUE.equals(requestDto.getIsAnonymous()))
                .isDeleted(false)
                .build();

        GatheringPost saved = gatheringPostRepository.save(post);
        return GatheringPostResponseDto.fromEntity(saved, 0L, true);
    }

    @Override
    @Transactional
    public GatheringPostResponseDto updatePost(Long postId, GatheringPostUpdateRequestDto requestDto, String username) {
        User user = getRequester(username);

        GatheringPost post = gatheringPostRepository.findByPostIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않거나 삭제된 게시글입니다."));

        if (!post.getUser().getUserIdx().equals(user.getUserIdx())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인이 작성한 게시글만 수정할 수 있습니다.");
        }

        GatheringTag tag = gatheringTagRepository.findById(requestDto.getTagId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 태그를 찾을 수 없습니다."));

        post.setTag(tag);
        post.setTitle(requestDto.getTitle());
        post.setContent(requestDto.getContent());
        if (requestDto.getEmojiIdx() != null) {
            post.setEmojiIdx(requestDto.getEmojiIdx());
        }
        if (requestDto.getIsAnonymous() != null) {
            post.setIsAnonymous(requestDto.getIsAnonymous());
        }

        GatheringPost updated = gatheringPostRepository.save(post);
        long commentCount = gatheringCommentRepository.countByPost_PostIdAndIsDeletedFalse(postId);
        return GatheringPostResponseDto.fromEntity(updated, commentCount, true);
    }

    @Override
    @Transactional
    public void deletePost(Long postId, String username) {
        User user = getRequester(username);

        GatheringPost post = gatheringPostRepository.findByPostIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않거나 이미 삭제된 게시글입니다."));

        if (!post.getUser().getUserIdx().equals(user.getUserIdx()) && !isAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "게시글 삭제 권한이 없습니다.");
        }

        post.setIsDeleted(true);
        post.setDeletedAt(LocalDateTime.now());
        gatheringPostRepository.save(post);
    }

    @Override
    @Transactional
    public void restorePost(Long postId, String username) {
        User user = getRequester(username);
        if (!isAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "게시글 복구 권한이 없습니다. (관리자 전용)");
        }

        GatheringPost post = gatheringPostRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 게시글입니다."));

        post.setIsDeleted(false);
        post.setDeletedAt(null);
        gatheringPostRepository.save(post);
    }

    @Override
    @Transactional
    public void reportPost(Long postId, GatheringReportRequestDto requestDto, String username) {
        User user = getRequester(username);

        gatheringPostRepository.findByPostIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않거나 삭제된 게시글입니다."));

        GatheringReport report = GatheringReport.builder()
                .targetType("POST")
                .postId(postId)
                .commentId(null)
                .user(user)
                .reason(requestDto.getReason())
                .details(requestDto.getDetails())
                .status("PENDING")
                .build();

        gatheringReportRepository.save(report);
    }

    // ==================== 댓글 ====================

    @Override
    @Transactional(readOnly = true)
    public List<GatheringCommentResponseDto> getComments(Long postId, String username) {
        User currentUser = getRequesterOptional(username);

        List<GatheringComment> comments = gatheringCommentRepository.findByPostIdWithUser(postId);

        return comments.stream().map(c -> {
            // 준익명제 원칙: 관리자라도 기본 조회 시 작성자 본인이 아니면 익명 마스킹
            boolean canViewRealAuthor = currentUser != null && c.getUser().getUserIdx().equals(currentUser.getUserIdx());
            return GatheringCommentResponseDto.fromEntity(c, canViewRealAuthor);
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GatheringCommentResponseDto createComment(Long postId, GatheringCommentCreateRequestDto requestDto, String username) {
        User user = getRequester(username);

        GatheringPost post = gatheringPostRepository.findByPostIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않거나 삭제된 게시글입니다."));

        GatheringComment comment = GatheringComment.builder()
                .post(post)
                .user(user)
                .authorName(user.getUserName())
                .content(requestDto.getContent())
                .isAnonymous(Boolean.TRUE.equals(requestDto.getIsAnonymous()))
                .isDeleted(false)
                .build();

        GatheringComment saved = gatheringCommentRepository.save(comment);
        return GatheringCommentResponseDto.fromEntity(saved, true);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, String username) {
        User user = getRequester(username);

        GatheringComment comment = gatheringCommentRepository.findByCommentIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않거나 이미 삭제된 댓글입니다."));

        if (!comment.getUser().getUserIdx().equals(user.getUserIdx()) && !isAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "댓글 삭제 권한이 없습니다.");
        }

        comment.setIsDeleted(true);
        comment.setDeletedAt(LocalDateTime.now());
        gatheringCommentRepository.save(comment);
    }

    @Override
    @Transactional
    public void reportComment(Long commentId, GatheringReportRequestDto requestDto, String username) {
        User user = getRequester(username);

        GatheringComment comment = gatheringCommentRepository.findByCommentIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않거나 삭제된 댓글입니다."));

        GatheringReport report = GatheringReport.builder()
                .targetType("COMMENT")
                .postId(comment.getPost().getPostId())
                .commentId(commentId)
                .user(user)
                .reason(requestDto.getReason())
                .details(requestDto.getDetails())
                .status("PENDING")
                .build();

        gatheringReportRepository.save(report);
    }

    // ==================== 관리자 신고 관리 ====================

    @Override
    @Transactional(readOnly = true)
    public List<GatheringReportResponseDto> getReports(String status, Integer page, Integer size, String username) {
        User requester = getRequester(username);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }

        int pageNo = (page != null && page >= 0) ? page : 0;
        int pageSize = (size != null && size > 0) ? size : 50;
        Pageable pageable = PageRequest.of(pageNo, pageSize);

        Page<GatheringReport> reportPage;
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            reportPage = gatheringReportRepository.findAllByOrderByCreatedAtDesc(pageable);
        } else {
            reportPage = gatheringReportRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pageable);
        }

        return reportPage.getContent().stream()
                .map(GatheringReportResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateReportStatus(Long reportId, GatheringReportStatusUpdateRequestDto requestDto, String username) {
        User requester = getRequester(username);
        if (!isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }

        GatheringReport report = gatheringReportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 신고 내역을 찾을 수 없습니다."));

        report.setStatus(requestDto.getStatus().toUpperCase());
        gatheringReportRepository.save(report);
    }

    @Override
    @Transactional
    public GatheringUnmaskResponseDto unmaskRealAuthor(GatheringUnmaskRequestDto requestDto, String username) {
        User admin = getRequester(username);
        if (!isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "익명 실명 열람 권한이 없습니다. (관리자 전용)");
        }

        User targetUser;
        if ("POST".equalsIgnoreCase(requestDto.getTargetType())) {
            GatheringPost post = gatheringPostRepository.findById(requestDto.getTargetId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 게시글을 찾을 수 없습니다."));
            targetUser = post.getUser();
        } else if ("COMMENT".equalsIgnoreCase(requestDto.getTargetType())) {
            GatheringComment comment = gatheringCommentRepository.findById(requestDto.getTargetId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 댓글을 찾을 수 없습니다."));
            targetUser = comment.getUser();
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바르지 않은 targetType입니다. (POST 또는 COMMENT)");
        }

        LocalDateTime now = LocalDateTime.now();

        // 감사 로그 영구 기록 (gathering_unmask_logs)
        GatheringUnmaskLog log = GatheringUnmaskLog.builder()
                .adminId(admin.getUserId())
                .targetType(requestDto.getTargetType().toUpperCase())
                .targetId(requestDto.getTargetId())
                .targetUserId(targetUser.getUserId())
                .reason(requestDto.getEffectiveReason())
                .viewedAt(now)
                .build();

        gatheringUnmaskLogRepository.save(log);

        String branchName = (targetUser.getWorkPlace() != null) ? targetUser.getWorkPlace().getWpName() : "소속 없음";

        return GatheringUnmaskResponseDto.builder()
                .targetId(requestDto.getTargetId())
                .realName(targetUser.getUserName())
                .targetUserId(targetUser.getUserId())
                .branch(branchName)
                .viewedAt(now)
                .build();
    }

    @Override
    @Transactional
    public GatheringAdminUnmaskResponseDto adminUnmask(GatheringAdminUnmaskRequestDto requestDto, String username) {
        User admin = getRequester(username);
        if (!isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "실명 열람 권한이 없습니다. (관리자 전용)");
        }

        String targetType = requestDto.getTargetType();
        boolean isAll = "all".equalsIgnoreCase(targetType);
        LocalDateTime now = LocalDateTime.now();

        if (isAll) {
            // 전체 일괄 열람: 익명 게시글 전체 대상 감사 로그 저장
            List<GatheringPost> anonymousPosts = gatheringPostRepository.findAll().stream()
                    .filter(p -> Boolean.TRUE.equals(p.getIsAnonymous()) && p.getUser() != null)
                    .collect(Collectors.toList());

            if (!anonymousPosts.isEmpty()) {
                List<GatheringUnmaskLog> logs = anonymousPosts.stream()
                        .map(post -> GatheringUnmaskLog.builder()
                                .adminId(admin.getUserId())
                                .targetType("POST")
                                .targetId(post.getPostId())
                                .targetUserId(post.getUser().getUserId())
                                .reason(requestDto.getReason())
                                .viewedAt(now)
                                .build())
                        .collect(Collectors.toList());
                gatheringUnmaskLogRepository.saveAll(logs);
            }

            // 전체 열람은 realAuthorName 반환 불필요 (데이터는 GET /posts?unmask=true로 확인)
            return GatheringAdminUnmaskResponseDto.builder()
                    .realAuthorName(null)
                    .build();
        }

        // 단건 열람: POST targetId로 게시글 조회
        if (!"POST".equalsIgnoreCase(targetType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetType은 'POST' 또는 'all'만 가능합니다.");
        }

        GatheringPost post = gatheringPostRepository.findById(requestDto.getTargetId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 게시글을 찾을 수 없습니다."));

        User targetUser = post.getUser();
        if (targetUser == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "작성자 정보를 찾을 수 없습니다.");
        }

        // targetUserId 검증 (서버가 작성자와 일치하는지 확인, 0이면 무시)
        if (requestDto.getTargetUserId() != 0 && !targetUser.getUserIdx().equals(requestDto.getTargetUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetUserId가 실제 작성자와 일치하지 않습니다.");
        }

        // 감사 로그 단건 저장
        GatheringUnmaskLog log = GatheringUnmaskLog.builder()
                .adminId(admin.getUserId())
                .targetType("POST")
                .targetId(post.getPostId())
                .targetUserId(targetUser.getUserId())
                .reason(requestDto.getReason())
                .viewedAt(now)
                .build();
        gatheringUnmaskLogRepository.save(log);

        return GatheringAdminUnmaskResponseDto.builder()
                .realAuthorName(targetUser.getUserName())
                .build();
    }
}
