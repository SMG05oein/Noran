package com.recode.Dwaeji.gathering.dto;

import com.recode.Dwaeji.gathering.database.GatheringReport;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatheringReportResponseDto {
    private Long id;
    private Long reportId;
    private String targetType;
    private Long postId;
    private Long commentId;
    private Long userIdx;
    private String reporterName;
    private String reason;
    private String details;
    private String status;
    private LocalDateTime createdAt;

    public static GatheringReportResponseDto fromEntity(GatheringReport report) {
        if (report == null) return null;

        return GatheringReportResponseDto.builder()
                .id(report.getReportId())
                .reportId(report.getReportId())
                .targetType(report.getTargetType())
                .postId(report.getPostId())
                .commentId(report.getCommentId())
                .userIdx(report.getUser() != null ? report.getUser().getUserIdx() : null)
                .reporterName(report.getUser() != null ? report.getUser().getUserName() : "알 수 없음")
                .reason(report.getReason())
                .details(report.getDetails())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
