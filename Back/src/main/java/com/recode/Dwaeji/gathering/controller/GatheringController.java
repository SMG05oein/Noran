package com.recode.Dwaeji.gathering.controller;

import com.recode.Dwaeji.gathering.dto.*;
import com.recode.Dwaeji.gathering.service.GatheringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Tag(name = "돼지들 모임 커뮤니티 API", description = "알바생 전용 게시판(태그, 게시글, 댓글, 신고, 이용규정) API")
@RestController
@RequestMapping("/api/gathering")
@RequiredArgsConstructor
public class GatheringController {

    private final GatheringService gatheringService;

    private String getUsername(UserDetails userDetails) {
        return userDetails != null ? userDetails.getUsername() : null;
    }

    // ==================== 이용규정 API ====================

    @Operation(summary = "이용규정 동의 여부 조회", description = "현재 로그인한 알바생의 게시판 이용규정 동의 여부를 확인합니다.")
    @GetMapping("/rules/status")
    public ResponseEntity<GatheringRulesStatusResponseDto> getRulesStatus(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.getRulesStatus(getUsername(userDetails)));
    }

    @Operation(summary = "이용규정 동의 처리", description = "게시판 이용규정에 동의합니다.")
    @PostMapping("/rules/agree")
    public ResponseEntity<String> agreeRules(
            @AuthenticationPrincipal UserDetails userDetails) {
        gatheringService.agreeRules(getUsername(userDetails));
        return ResponseEntity.ok("이용규정에 동의하였습니다.");
    }

    // ==================== 태그 API ====================

    @Operation(summary = "태그 목록 조회", description = "전체 게시판 태그 목록을 조회합니다.")
    @GetMapping("/tags")
    public ResponseEntity<List<GatheringTagResponseDto>> getAllTags() {
        return ResponseEntity.ok(gatheringService.getAllTags());
    }

    @Operation(summary = "신규 태그 추가", description = "모든 알바생이 새로운 태그를 추가할 수 있습니다.")
    @PostMapping("/tags")
    public ResponseEntity<GatheringTagResponseDto> createTag(
            @Valid @RequestBody GatheringTagCreateRequestDto requestDto) {
        return ResponseEntity.ok(gatheringService.createTag(requestDto));
    }

    @Operation(summary = "태그 수정", description = "관리자 권한만 태그를 수정할 수 있습니다.")
    @PutMapping("/tags/{tagId}")
    public ResponseEntity<GatheringTagResponseDto> updateTag(
            @PathVariable Integer tagId,
            @Valid @RequestBody GatheringTagUpdateRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.updateTag(tagId, requestDto, getUsername(userDetails)));
    }

    @Operation(summary = "태그 삭제", description = "관리자 권한만 태그를 삭제할 수 있습니다.")
    @DeleteMapping("/tags/{tagId}")
    public ResponseEntity<String> deleteTag(
            @PathVariable Integer tagId,
            @AuthenticationPrincipal UserDetails userDetails) {
        gatheringService.deleteTag(tagId, getUsername(userDetails));
        return ResponseEntity.ok("태그가 삭제되었습니다.");
    }

    // ==================== 게시글 API ====================

    @Operation(summary = "게시글 목록 조회", description = "게시글 목록을 조회합니다. 태그 필터, 내 글 필터, 키워드 검색, 삭제글 포함(관리자 전용), 익명 실명 일괄 열람(관리자 전용: unmask=true)을 지원합니다.")
    @GetMapping("/posts")
    public ResponseEntity<List<GatheringPostResponseDto>> getPosts(
            @RequestParam(required = false) String tagId,
            @RequestParam(required = false) Boolean myOnly,
            @RequestParam(required = false) Long userIdx,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "false") Boolean includeDeleted,
            @RequestParam(required = false, defaultValue = "false") Boolean unmask,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @AuthenticationPrincipal UserDetails userDetails) {
        Integer parsedTagId = null;
        if (tagId != null && !tagId.isBlank()) {
            String trimmed = tagId.trim();
            if ("all".equalsIgnoreCase(trimmed)) {
                parsedTagId = null; // 'all'이면 전체 목록 조회
            } else {
                try {
                    parsedTagId = Integer.parseInt(trimmed);
                    if (parsedTagId <= 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 접근입니다.");
                    }
                } catch (NumberFormatException e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 접근입니다.");
                }
            }
        }
        return ResponseEntity.ok(gatheringService.getPosts(parsedTagId, myOnly, userIdx, keyword, includeDeleted, unmask, page, size, getUsername(userDetails)));
    }

    @Operation(summary = "게시글 단건 상세 조회", description = "게시글 상세 정보를 조회합니다.")
    @GetMapping("/posts/{postId}")
    public ResponseEntity<GatheringPostResponseDto> getPost(
            @PathVariable Long postId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.getPost(postId, getUsername(userDetails)));
    }

    @Operation(summary = "게시글 등록", description = "새로운 게시글을 작성합니다. JWT 인증 알바생 정보가 자동 반영됩니다.")
    @PostMapping("/posts")
    public ResponseEntity<GatheringPostResponseDto> createPost(
            @Valid @RequestBody GatheringPostCreateRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.createPost(requestDto, getUsername(userDetails)));
    }

    @Operation(summary = "게시글 수정", description = "작성자 본인만 게시글을 수정할 수 있습니다.")
    @PutMapping("/posts/{postId}")
    public ResponseEntity<GatheringPostResponseDto> updatePost(
            @PathVariable Long postId,
            @Valid @RequestBody GatheringPostUpdateRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.updatePost(postId, requestDto, getUsername(userDetails)));
    }

    @Operation(summary = "게시글 논리적 삭제", description = "게시글을 논리적으로 삭제합니다. (작성자 본인 또는 관리자)")
    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<String> deletePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal UserDetails userDetails) {
        gatheringService.deletePost(postId, getUsername(userDetails));
        return ResponseEntity.ok("게시글이 삭제되었습니다.");
    }

    @Operation(summary = "게시글 복구 (관리자 전용)", description = "논리적으로 삭제된 게시글을 복구합니다.")
    @PostMapping("/posts/{postId}/restore")
    public ResponseEntity<java.util.Map<String, Object>> restorePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal UserDetails userDetails) {
        gatheringService.restorePost(postId, getUsername(userDetails));
        return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "message", "게시글이 성공적으로 복구되었습니다."
        ));
    }

    @Operation(summary = "게시글 신고 접수", description = "부적절한 게시글을 신고합니다.")
    @PostMapping("/posts/{postId}/report")
    public ResponseEntity<String> reportPost(
            @PathVariable Long postId,
            @Valid @RequestBody GatheringReportRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        gatheringService.reportPost(postId, requestDto, getUsername(userDetails));
        return ResponseEntity.ok("신고가 정상적으로 접수되었습니다.");
    }

    // ==================== 댓글 API ====================

    @Operation(summary = "게시글 댓글 목록 조회", description = "특정 게시글의 활성 댓글 목록을 조회합니다.")
    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<GatheringCommentResponseDto>> getComments(
            @PathVariable Long postId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.getComments(postId, getUsername(userDetails)));
    }

    @Operation(summary = "댓글 작성", description = "특정 게시글에 댓글을 작성합니다.")
    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<GatheringCommentResponseDto> createComment(
            @PathVariable Long postId,
            @Valid @RequestBody GatheringCommentCreateRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.createComment(postId, requestDto, getUsername(userDetails)));
    }

    @Operation(summary = "댓글 논리적 삭제", description = "댓글을 논리적으로 삭제합니다. (작성자 본인 또는 관리자)")
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<String> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        gatheringService.deleteComment(commentId, getUsername(userDetails));
        return ResponseEntity.ok("댓글이 삭제되었습니다.");
    }

    @Operation(summary = "댓글 신고 접수", description = "부적절한 댓글을 신고합니다.")
    @PostMapping("/comments/{commentId}/report")
    public ResponseEntity<String> reportComment(
            @PathVariable Long commentId,
            @Valid @RequestBody GatheringReportRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        gatheringService.reportComment(commentId, requestDto, getUsername(userDetails));
        return ResponseEntity.ok("댓글 신고가 정상적으로 접수되었습니다.");
    }

    // ==================== 관리자 신고 관리 API ====================

    @Operation(summary = "신고 내역 목록 조회 (관리자 전용)", description = "관리자가 커뮤니티 신고 접수 내역을 조회합니다. status (ALL, PENDING, RESOLVED, DISMISSED) 필터 및 페이징을 지원합니다.")
    @GetMapping("/reports")
    public ResponseEntity<List<GatheringReportResponseDto>> getReports(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "0") Integer page,
            @RequestParam(required = false, defaultValue = "50") Integer size,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.getReports(status, page, size, getUsername(userDetails)));
    }

    @Operation(summary = "신고 상태 변경 (관리자 전용)", description = "관리자가 신고 접수 건의 상태를 RESOLVED, DISMISSED, PENDING 등으로 변경합니다.")
    @PutMapping("/reports/{reportId}")
    public ResponseEntity<java.util.Map<String, Object>> updateReportStatus(
            @PathVariable Long reportId,
            @Valid @RequestBody GatheringReportStatusUpdateRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        gatheringService.updateReportStatus(reportId, requestDto, getUsername(userDetails));
        return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "message", "신고 처리가 완료되었습니다."
        ));
    }

    // ==================== 익명 작성자 실명 열람 (Audit Log) API ====================

    @Operation(summary = "익명 작성자 실명 열람 (관리자 전용)", description = "정당한 사유를 기록하고 익명 작성자의 실명 및 소속 지점 정보를 확인합니다. 열람 이력은 영구 감사 로그로 보관됩니다.")
    @PostMapping({"/unmask", "/admin/audit/reveal"})
    public ResponseEntity<GatheringUnmaskResponseDto> unmaskRealAuthor(
            @Valid @RequestBody GatheringUnmaskRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.unmaskRealAuthor(requestDto, getUsername(userDetails)));
    }

    @Operation(summary = "관리자 게시글 익명 실명 열람/로그 기록", description = "관리자가 특정 글 또는 전체 글 실명 열람 시 감사 로그를 기록하고 행별 열람 시 실명을 반환합니다.")
    @PostMapping("/admin/unmask")
    public ResponseEntity<GatheringAdminUnmaskResponseDto> adminUnmask(
            @Valid @RequestBody GatheringAdminUnmaskRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(gatheringService.adminUnmask(requestDto, getUsername(userDetails)));
    }
}
