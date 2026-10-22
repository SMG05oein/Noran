import { Modal, ProgressBar, Button } from 'react-bootstrap';

/**
 * 엑셀 대조(AdminExcelCompare)와 톤을 맞춘 동기 API용 진행률 모달.
 */
const ExcelProgressModal = ({
  show,
  title = '처리 중...',
  description = '대용량 파일의 경우 시간이 걸릴 수 있습니다.',
  progress = 0,
  onCancel,
  cancelLabel = '취소',
  cancelHint = '요청을 중단합니다. 이미 서버에서 처리 중이면 작업이 계속될 수 있습니다.',
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <Modal show={show} backdrop="static" keyboard={false} centered>
      <Modal.Body className="text-center py-5">
        <h5 className="fw-bold mb-3">{title}</h5>
        <p className="text-muted small mb-4">{description}</p>
        <ProgressBar animated now={pct} label={`${pct}%`} style={{ height: '25px' }} />
        {onCancel && (
          <div className="mt-4">
            <Button variant="outline-secondary" size="sm" onClick={onCancel} className="px-3">
              {cancelLabel}
            </Button>
            <p className="text-muted small mt-2 mb-0" style={{ fontSize: '0.78rem' }}>
              {cancelHint}
            </p>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

/** 모달 본문/업로드 모달 내부에 임베드할 때 사용 */
export const ExcelProgressPanel = ({
  title = '처리 중...',
  description = '대용량 파일의 경우 시간이 걸릴 수 있습니다.',
  progress = 0,
  onCancel,
  cancelLabel = '닫기',
  cancelHint = '화면만 닫습니다. 이미 서버에서 처리 중이면 작업이 계속될 수 있습니다.',
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="text-center py-5">
      <h5 className="fw-bold mb-3">{title}</h5>
      <p className="text-muted small mb-4">{description}</p>
      <ProgressBar animated now={pct} label={`${pct}%`} style={{ height: '25px' }} />
      {onCancel && (
        <div className="mt-4">
          <Button variant="outline-secondary" size="sm" onClick={onCancel} className="px-3">
            {cancelLabel}
          </Button>
          <p className="text-muted small mt-2 mb-0" style={{ fontSize: '0.78rem' }}>
            {cancelHint}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExcelProgressModal;
