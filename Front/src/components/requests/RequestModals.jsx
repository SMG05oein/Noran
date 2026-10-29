import React from 'react';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import { format, addDays, parseISO, getDay } from 'date-fns';
import { RiDeleteBinLine, RiAddLine } from 'react-icons/ri';
import { PlaceSelect, BatchApplyBar, ApplyWeekGrid } from './ApplyWeekMatrix';
import {
  DAY_LABELS,
  isPublicAssignment,
  isBlankStatus,
  displayStatusLabel,
  displayOpenTime
} from './requestsUtils';

export const CellDetailModal = ({
  selectedCellDetail,
  onHide
}) => {
  return (
    <Modal show={!!selectedCellDetail} onHide={onHide} centered size="sm">
      <Modal.Header closeButton className="py-2">
        <Modal.Title className="fs-6 fw-bold">
          {selectedCellDetail && `${format(selectedCellDetail.date, 'M월 d일')} (${DAY_LABELS[getDay(selectedCellDetail.date)]}) 상세`}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-3 text-center">
        <div className="fs-5 fw-bold mb-1" style={{ color: 'var(--color-primary)' }}>
          {selectedCellDetail?.label}
        </div>
        {selectedCellDetail?.slot?.wsdWorkPlaceName && (
          <div className="text-muted small mt-1">
            근무 지점: {selectedCellDetail.slot.wsdWorkPlaceName}
          </div>
        )}
        {selectedCellDetail?.slot?.applyWorkPlaceName && (
          <div className="text-muted small mt-1">
            신청 지점: {selectedCellDetail.slot.applyWorkPlaceName}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="py-1 justify-content-center border-0">
        <Button variant="secondary" size="sm" onClick={onHide}>
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const EditTargetModal = ({
  editTarget,
  onHide,
  editBlocks,
  setEditBlocks,
  workPlaces,
  handleEditBatchApply,
  handleToggleEditBlockDayType,
  defaultBlock,
  editGlobalRemarks,
  setEditGlobalRemarks,
  handleEditSubmit,
  editLoading
}) => {
  return (
    <Modal show={!!editTarget} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="fw-bold fs-5">
          근무 신청 수정
          {editTarget && (
            <div className="req-apply-week-hint mt-1">
              {format(parseISO(editTarget.monDate), 'M/d')} – {format(addDays(parseISO(editTarget.monDate), 6), 'M/d')}
            </div>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3 p-md-4">
        {editBlocks.map((block) => (
          <div key={block.id} className="req-apply-block mb-3">
            {editBlocks.length > 1 && (
              <Button
                variant="link"
                className="position-absolute top-0 end-0 text-danger p-2"
                onClick={() => setEditBlocks(prev => prev.filter(b => b.id !== block.id))}
              >
                <RiDeleteBinLine size={20} />
              </Button>
            )}

            <PlaceSelect
              workPlaces={workPlaces}
              value={block.workPlaceIdx}
              onChange={(wpIdx) => setEditBlocks(prev => prev.map(b => b.id === block.id ? { ...b, workPlaceIdx: wpIdx } : b))}
            />

            <BatchApplyBar
              onBatch={(scope, type) => handleEditBatchApply(block.id, scope, type)}
            />

            {editTarget && (
              <ApplyWeekGrid
                monday={parseISO(editTarget.monDate)}
                block={block}
                onToggleType={(day, type) => handleToggleEditBlockDayType(block.id, day, type)}
              />
            )}
          </div>
        ))}
        <Button
          variant="outline-secondary"
          className="w-100 py-2 mb-3 fw-bold d-flex align-items-center justify-content-center gap-2"
          onClick={() => setEditBlocks(prev => [...prev, defaultBlock(Date.now())])}
        >
          <RiAddLine size={20} /> 타 지점 추가 신청하기
        </Button>
        <Form.Group>
          <Form.Label className="fw-bold text-muted small">비고</Form.Label>
          <Form.Control type="text" value={editGlobalRemarks} onChange={e => setEditGlobalRemarks(e.target.value)} placeholder="해당 주간에 전달할 메모" className="custom-input" />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button variant="secondary" onClick={onHide}>취소</Button>
        <Button variant="primary" onClick={handleEditSubmit} disabled={editLoading} className="fw-bold">
          {editLoading ? '수정 중...' : '수정 완료'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const ViewingRequestModal = ({
  viewingRequest,
  onHide
}) => {
  return (
    <Modal show={!!viewingRequest} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">
          {viewingRequest ? `${viewingRequest.monDate} ~ ${format(addDays(parseISO(viewingRequest.monDate), 6), 'yyyy-MM-dd')} 상세` : ''}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="table-responsive">
          <Table bordered hover className="custom-table text-center mb-0">
            <thead>
              <tr><th>날짜</th><th>상태</th><th>출근 시간</th><th>근무 지점</th></tr>
            </thead>
            <tbody>
              {viewingRequest && Object.values(
                viewingRequest.weekSchs.reduce((acc, s) => {
                  const key = `${s.date}_${s.applyWorkPlaceIdx || s.wsdWorkPlaceIdx || 'none'}`;
                  if (!acc[key] || (!isBlankStatus(s.wsdStatus) && isBlankStatus(acc[key].wsdStatus))) {
                    acc[key] = s;
                  }
                  return acc;
                }, {})
              ).sort((a, b) => new Date(a.date) - new Date(b.date)).map(s => {
                const dateObj = parseISO(s.date);
                return (
                  <tr key={s.wsdIdx || `${s.date}_${s.applyWorkPlaceIdx || s.wsdWorkPlaceIdx}`}>
                    <td>{`${format(dateObj, 'MM/dd')} (${DAY_LABELS[getDay(dateObj)]})`}</td>
                    <td><span className={`req-status-badge ${isPublicAssignment(s) ? 'work' : s.wsdStatus === '신청' ? 'applied' : (s.wsdStatus === '미출근' || s.wsdStatus === '미배정') ? 'rejected' : 'muted'}`}>{displayStatusLabel(s)}</span></td>
                    <td>{isPublicAssignment(s) ? (displayOpenTime(s, dateObj) || '-') : '-'}</td>
                    <td>{s.wsdWorkPlaceName || s.applyWorkPlaceName || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Modal.Body>
    </Modal>
  );
};

