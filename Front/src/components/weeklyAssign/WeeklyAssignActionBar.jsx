import React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { RiDownload2Line, RiUserAddLine, RiMore2Line } from 'react-icons/ri';
import StickyActionBar from '../ui/StickyActionBar';

const WeeklyAssignActionBar = ({
  handleDownloadExcel,
  excelDownloading,
  loading,
  onOpenAddWorker,
  handleSaveAll,
  saving,
  onOpenMoreSheet
}) => {
  return (
    <StickyActionBar
      className="wat-sticky-action-bar"
      right={
        <>
          {/* 데스크톱(> 450px): 5개 버튼 전체 노출 */}
          <div className="wat-desktop-actions">
            <Button variant="success" onClick={handleDownloadExcel} disabled={excelDownloading || loading}>
              {excelDownloading ? <Spinner size="sm" className="me-1" /> : <RiDownload2Line className="me-1" />}
              엑셀
            </Button>
            <Button variant="outline-primary" onClick={onOpenAddWorker}>
              <RiUserAddLine className="me-1" /> 타지점
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => handleSaveAll('DRAFT')}
              disabled={saving || loading}
              title="저장만 합니다. 알바생에게 공개되지 않습니다."
            >
              {saving ? <Spinner size="sm" /> : '임시 저장'}
            </Button>
            <Button
              variant="outline-success"
              onClick={() => handleSaveAll('PARTIAL')}
              disabled={saving || loading}
              title="배정된 날만 공개됩니다. 미배정 날은 신청 상태로 유지됩니다."
            >
              {saving ? <Spinner size="sm" /> : '임시 배정'}
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSaveAll('CONFIRM')}
              disabled={saving || loading}
              title="모든 날을 확정합니다. 미배정 신청은 미출근으로 처리됩니다."
            >
              {saving ? <Spinner size="sm" /> : '배정 확정'}
            </Button>
          </div>

          {/* 모바일(<= 450px): 주요 액션 2개 + 더보기 바텀시트 트리거 */}
          <div className="wat-mobile-actions">
            <Button
              variant="outline-secondary"
              className="wat-mobile-more-btn"
              onClick={onOpenMoreSheet}
              aria-label="더보기 메뉴 열기"
              title="더보기"
            >
              <RiMore2Line size={20} />
            </Button>
            <Button
              variant="outline-secondary"
              className="wat-mobile-draft-btn"
              onClick={() => handleSaveAll('DRAFT')}
              disabled={saving || loading}
              title="저장만 합니다. 알바생에게 공개되지 않습니다."
            >
              {saving ? <Spinner size="sm" /> : '임시 저장'}
            </Button>
            <Button
              variant="primary"
              className="wat-mobile-confirm-btn"
              onClick={() => handleSaveAll('CONFIRM')}
              disabled={saving || loading}
              title="모든 날을 확정합니다. 미배정 신청은 미출근으로 처리됩니다."
            >
              {saving ? <Spinner size="sm" /> : '배정 확정'}
            </Button>
          </div>
        </>
      }
    />
  );
};

export default WeeklyAssignActionBar;

