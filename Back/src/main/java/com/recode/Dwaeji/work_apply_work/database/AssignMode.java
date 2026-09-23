package com.recode.Dwaeji.work_apply_work.database;

/**
 * 주간 배정 저장 모드.
 * DRAFT: 임시 저장(미공개), PARTIAL: 일부만 공개 배정, CONFIRM: 주 전체 확정(+미출근 변환).
 */
public enum AssignMode {
    DRAFT,
    PARTIAL,
    CONFIRM;

    public static AssignMode from(String assignMode, boolean confirmedFallback) {
        if (assignMode != null && !assignMode.isBlank()) {
            try {
                return AssignMode.valueOf(assignMode.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("assignMode는 DRAFT, PARTIAL, CONFIRM 중 하나여야 합니다.");
            }
        }
        return confirmedFallback ? CONFIRM : DRAFT;
    }

    /** CONFIRM만 신청→미출근 일괄 변환 */
    public boolean convertsUnassignedApplies() {
        return this == CONFIRM;
    }

    /** DRAFT는 isConfirmed를 항상 false로 강제 */
    public boolean forcesUnconfirmed() {
        return this == DRAFT;
    }

    /** DRAFT/PARTIAL은 payload 키만 upsert. CONFIRM은 기간·지점 단위로 미포함 행 삭제 */
    public boolean replacesWholeRange() {
        return this == CONFIRM;
    }
}
