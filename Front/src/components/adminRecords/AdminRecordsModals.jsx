import React from 'react';
import { Modal, Form, Button, Spinner, Badge, Card } from 'react-bootstrap';
import { RiSearchLine, RiArrowRightSLine, RiRefreshLine } from 'react-icons/ri';
import { formatDateStr, formatHistoryTime } from './adminRecordsUtils';

const AdminRecordsModals = ({
  // Edit modal props
  editRecord,
  setEditRecord,
  editWorkPlaceIdx,
  setEditWorkPlaceIdx,
  branches,
  startHour,
  setStartHour,
  startMin,
  setStartMin,
  endHour,
  setEndHour,
  endMin,
  setEndMin,
  restHour,
  setRestHour,
  restMin,
  setRestMin,
  remarks,
  setRemarks,
  saving,
  onSaveEdit,

  // History modal props
  showHistoryModal,
  setShowHistoryModal,
  historySearchInput,
  setHistorySearchInput,
  onHistorySearch,
  historyLoading,
  filteredHistory,
  onRestoreRecord
}) => {
  return (
    <>
      {/* 수정 모달 */}
      <Modal show={!!editRecord} onHide={() => setEditRecord(null)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-dark fs-5">근무 기록 수정</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {editRecord && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">직원 및 날짜</Form.Label>
                <div className="p-2 bg-light rounded-3">
                  <span className="fw-bold text-primary">{editRecord.userName}</span> / {formatDateStr(editRecord.wrDate)}
                </div>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">근무지</Form.Label>
                <Form.Select
                  value={editWorkPlaceIdx}
                  onChange={(e) => setEditWorkPlaceIdx(e.target.value)}
                  className="custom-input"
                >
                  <option value="">근무지 선택</option>
                  {branches.filter((b) => b.wpIdx != null).map((b) => {
                    const isHome = editRecord.userWorkPlaceName
                      && b.wpName === editRecord.userWorkPlaceName;
                    return (
                      <option key={b.wpIdx} value={String(b.wpIdx)}>
                        {b.wpName}{isHome ? ' (소속)' : ''}
                      </option>
                    );
                  })}
                </Form.Select>
                {editWorkPlaceIdx && (() => {
                  const selected = branches.find((b) => String(b.wpIdx) === String(editWorkPlaceIdx));
                  const isHome = selected
                    && editRecord.userWorkPlaceName
                    && selected.wpName === editRecord.userWorkPlaceName;
                  return (
                    <div className={`small mt-1 fw-semibold ${isHome ? 'text-success' : 'text-warning'}`}>
                      {isHome
                        ? '소속 지점 근무'
                        : `타지점 근무 (소속: ${editRecord.userWorkPlaceName || '-'})`}
                    </div>
                  );
                })()}
              </Form.Group>
              <div className="d-flex gap-3 mb-3">
                <Form.Group className="flex-fill">
                  <Form.Label className="fw-bold text-muted small">출근 시간</Form.Label>
                  <div className="d-flex align-items-center gap-1">
                    <Form.Control type="number" min="0" max="23" value={startHour} onChange={e => setStartHour(e.target.value)} className="custom-input" /> :
                    <Form.Control type="number" min="0" max="59" value={startMin} onChange={e => setStartMin(e.target.value)} className="custom-input" />
                  </div>
                </Form.Group>
                <Form.Group className="flex-fill">
                  <Form.Label className="fw-bold text-muted small">퇴근 시간</Form.Label>
                  <div className="d-flex align-items-center gap-1">
                    <Form.Control type="number" min="0" max="23" value={endHour} onChange={e => setEndHour(e.target.value)} className="custom-input" /> :
                    <Form.Control type="number" min="0" max="59" value={endMin} onChange={e => setEndMin(e.target.value)} className="custom-input" />
                  </div>
                </Form.Group>
              </div>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-muted small">휴게 시간 (시:분)</Form.Label>
                <div className="d-flex align-items-center gap-1 w-50">
                  <Form.Control type="number" min="0" max="23" value={restHour} onChange={e => setRestHour(e.target.value)} className="custom-input" /> :
                  <Form.Control type="number" min="0" max="59" value={restMin} onChange={e => setRestMin(e.target.value)} className="custom-input" />
                </div>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold text-muted small">메모</Form.Label>
                <Form.Control as="textarea" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} className="custom-input" />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditRecord(null)} className="rounded-3">취소</Button>
          <Button variant="primary" onClick={onSaveEdit} disabled={saving} className="rounded-3 px-3">
            {saving ? <Spinner size="sm" animation="border" /> : '저장'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 근무기록 전체 수정 이력 모달 */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} centered scrollable size="lg">
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold fs-5">전체 근무 기록 수정 이력</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 bg-light">
          <Form onSubmit={onHistorySearch} className="mb-4">
            <div className="d-flex gap-2 bg-white p-2 rounded-3 shadow-sm border">
              <Form.Control
                type="text"
                placeholder="직원 이름 또는 관리자 이름 검색"
                value={historySearchInput}
                onChange={e => setHistorySearchInput(e.target.value)}
                className="border-0 shadow-none bg-transparent"
              />
              <Button type="submit" variant="primary" className="rounded-3 px-3 d-flex align-items-center gap-1">
                <RiSearchLine size={18} /> 검색
              </Button>
            </div>
          </Form>

          {historyLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-5 text-muted bg-white rounded-3 border">
              수정 이력이 없습니다.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredHistory.map((log, idx) => {
                const { oldVal, newVal } = formatHistoryTime(log);
                const displayDate = log.wrhCreatedAt ? log.wrhCreatedAt.replace('T', ' ').substring(0, 16) : '';
                return (
                  <Card key={idx} className="border-0 shadow-sm rounded-3">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="fw-bold d-flex align-items-center gap-2">
                          <span className="text-dark">[{log.wrDate}] {log.targetUserName}님({log.workPlaceName || '지점'}) 기록</span>
                          <Badge bg="info" className="fw-normal bg-opacity-10 text-info border border-info">
                            {log.adminName || '관리자'} 수정
                          </Badge>
                        </div>
                        <span className="text-muted small">{displayDate}</span>
                      </div>
                      <div className="bg-light p-2 rounded-2 small text-muted font-monospace">
                        <span className="text-decoration-line-through me-2 text-danger">{oldVal}</span>
                        <RiArrowRightSLine className="mx-1" />
                        <span className="fw-bold text-success">{newVal}</span>
                      </div>
                      {log.afterStartTime === null && (
                        <div className="mt-2 text-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-pill px-3 py-1 fw-bold d-flex align-items-center gap-1 ms-auto"
                            onClick={() => onRestoreRecord(log.wrhIdx)}
                          >
                            <RiRefreshLine size={14} /> 복구
                          </Button>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top bg-white">
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)} className="rounded-3 px-4">닫기</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AdminRecordsModals;

