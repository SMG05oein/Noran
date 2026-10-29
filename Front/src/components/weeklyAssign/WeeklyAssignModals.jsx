import React from 'react';
import { Modal, Button, Form, Badge } from 'react-bootstrap';
import { RiSearchLine, RiAddLine, RiQuestionLine } from 'react-icons/ri';
import { toUserIdx } from './weeklyAssignUtils';

export const AddOtherWorkerModal = ({
  show,
  onHide,
  workerSearchTerm,
  setWorkerSearchTerm,
  otherBranchCandidates,
  isOtherWorkerOnGrid,
  selectedOtherUserIdx,
  setSelectedOtherUserIdx,
  isOnLeave,
  onAdd
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5">타 지점 알바생 추가</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label className="small fw-bold text-muted">이름으로 검색</Form.Label>
          <div className="position-relative">
            <Form.Control
              type="text"
              placeholder="알바생 이름 입력"
              value={workerSearchTerm}
              onChange={(e) => setWorkerSearchTerm(e.target.value)}
              className="pe-5 bg-light border-0"
            />
            <RiSearchLine className="position-absolute text-muted" style={{ top: '10px', right: '12px' }} size={18} />
          </div>
        </Form.Group>
        <div className="d-flex flex-column gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {otherBranchCandidates.map(u => {
            const uid = toUserIdx(u.userIdx || u.id);
            const already = isOtherWorkerOnGrid(uid);
            const selected = !already && toUserIdx(selectedOtherUserIdx) === uid;
            const onLeave = isOnLeave(u);
            return (
              <div
                key={uid}
                className={`p-2 border rounded-2 d-flex justify-content-between align-items-center ${selected ? 'border-primary bg-primary bg-opacity-10' : ''} ${already || onLeave ? 'opacity-75' : ''}`}
                onClick={() => {
                  if (already) return;
                  setSelectedOtherUserIdx(uid);
                }}
                style={{ cursor: already ? 'default' : 'pointer' }}
              >
                <div>
                  <span className="fw-bold">{u.userName}</span>
                  {Number(u.nameSeq) > 1 && (u.userIdx != null || u.id != null) && (
                    <Badge bg="secondary" className="ms-1">#{u.userIdx ?? u.id}</Badge>
                  )}
                  <Badge bg="secondary" className="ms-2">{u.workPlaceName || '지점 미상'}</Badge>
                  {onLeave && (
                    <Badge bg="warning" text="dark" className="ms-1">휴직</Badge>
                  )}
                </div>
                {already ? (
                  <Badge bg="success">추가됨</Badge>
                ) : (
                  selected && <RiAddLine className="text-primary" />
                )}
              </div>
            );
          })}
          {otherBranchCandidates.length === 0 && (
            <div className="text-center text-muted small py-3">해당하는 알바생이 없습니다.</div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button variant="light" onClick={onHide}>취소</Button>
        <Button variant="primary" onClick={onAdd}>
          추가하기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const GuideModal = ({ show, onHide }) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2">
          <RiQuestionLine size={20} className="text-primary" />
          주간 스케줄 배정 사용 방법
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="wat-guide-body">
        <div className="wat-guide">
          <div className="wat-guide-alert">
            <div className="wat-guide-alert-title">한눈에 보기</div>
            <p className="mb-0 small">
              지점·주차를 고른 뒤 셀에서 출근 시간과 오픈을 맞추고, 하단의 <strong>임시 저장 → 임시 배정 → 배정 확정</strong> 순으로 저장하세요.
              알바생에게 최종 공개되는 것은 <strong>배정 확정</strong>(또는 임시 배정의 출근 셀)입니다.
            </p>
          </div>

          <h6 className="wat-guide-title">1. 화면 구성</h6>
          <ul className="wat-guide-list">
            <li><strong>지점 선택:</strong> 배정할 매장을 고릅니다.</li>
            <li><strong>주차 이동:</strong> 화살표·날짜 선택·이번 주로 주를 바꿉니다.</li>
            <li><strong>필터:</strong> 전체 / 출근 / 미출근으로 행을 좁혀 봅니다.</li>
            <li><strong>상태 칩:</strong> 배정 전 · 임시 저장 · 임시 배정 · 확정 — 현재 주의 공개 상태를 나타냅니다.</li>
            <li><strong>피크(P):</strong> 해당 날짜에 출근으로 잡힌 인원 수입니다.</li>
          </ul>

          <h6 className="wat-guide-title">2. 셀 상태 의미</h6>
          <ul className="wat-guide-list">
            <li><strong>미신청:</strong> 알바생이 아직 신청하지 않았고, 배정도 없는 날입니다.</li>
            <li><strong>신청:</strong> 알바생이 근무를 신청한 상태입니다. 아직 출근으로 확정되지 않았습니다.</li>
            <li><strong>신청 · 오픈:</strong> 오픈으로 신청했으나, 아직 오픈 출근 체크가 안 된 상태입니다.</li>
            <li><strong>출근:</strong> 시간과 오픈을 맞춰 배정한 상태입니다.</li>
            <li><strong>미출근:</strong> 신청은 있었으나 최종적으로 출근하지 않는 날로 처리된 상태입니다.</li>
          </ul>

          <h6 className="wat-guide-title">3. 배정하는 방법</h6>
          <ul className="wat-guide-list">
            <li>출근 시간을 입력하거나 <strong>오픈</strong>을 체크하면 해당 셀이 출근 배정으로 잡힙니다. 오픈을 켜면 시작 시간은 자동으로 맞춰지고 수동 수정은 잠깁니다.</li>
            <li><strong>일괄:</strong> 알바생 이름 아래 작은 버튼으로 그 행의 신청·배정 칸에 같은 상태(오픈 · 미출근 · 출근 시간)를 한꺼번에 넣을 수 있습니다. 칸별 수정은 그대로 가능하며, 미신청·빈 날은 대상에서 제외됩니다.</li>
            <li>잘못 고친 셀은 초기화(되돌리기) 버튼으로 원래 신청/배정 상태로 되돌릴 수 있습니다. 신청 내역 자체는 유지됩니다.</li>
          </ul>

          <h6 className="wat-guide-title">4. 저장 3모드 (가장 중요)</h6>
          <ul className="wat-guide-list">
            <li>
              <strong>임시 저장:</strong> 작업 내용을 서버에만 저장합니다.
              알바생에게는 <strong>공개되지 않습니다</strong>. 신청 셀은 그대로 둡니다.
            </li>
            <li>
              <strong>임시 배정:</strong> 이미 출근으로 맞춘 날만 알바생에게 공개합니다.
              아직 안 맞춘 신청 날은 <strong>신청 상태 그대로</strong> 유지됩니다.
            </li>
            <li>
              <strong>배정 확정:</strong> 해당 주를 최종 확정합니다.
              출근으로 맞춘 날은 공개되고, <strong>남은 신청은 미출근으로 바뀝니다</strong>.
            </li>
          </ul>
          <p className="wat-guide-note small mb-3">
            권장 순서: 임시 저장으로 초안 다듬기 → 일부만 먼저 공개할 때 임시 배정 → 주간 마감 시 배정 확정.
          </p>

          <h6 className="wat-guide-title">5. 타 지점 · 엑셀</h6>
          <ul className="wat-guide-list mb-0">
            <li><strong>타지점:</strong> 다른 매장 알바생을 이번 주 그리드에 추가해 파견 배정할 수 있습니다.</li>
            <li><strong>타지점 행 초기화:</strong> 타지점 알바생 행의 × 버튼으로 처리합니다. 신청이 있으면 배정만 되돌리고 행은 남고, 관리자가 넣기만 한 경우(신청 없음)는 목록에서 제거됩니다.</li>
            <li><strong>엑셀:</strong> 현재 화면의 주간 배정표를 다운로드합니다. (엑셀 파일은 클릭 시 별도로 로드됩니다.)</li>
          </ul>
        </div>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button
          variant="primary"
          size="sm"
          className="rounded-pill px-4 fw-bold"
          onClick={onHide}
        >
          확인
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const RemarkDetailModal = ({ show, userName, text, onHide }) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="wat-remark-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">
          {userName}님 비고
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="wat-remark-modal-body">
          {text}
        </div>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button
          variant="secondary"
          size="sm"
          className="rounded-pill px-3"
          onClick={onHide}
        >
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

