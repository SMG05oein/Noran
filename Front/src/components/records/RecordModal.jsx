import React, { useState, useEffect, useMemo } from 'react';
import { Form, Button, Modal, Offcanvas } from 'react-bootstrap';
import { format, subDays, parseISO } from 'date-fns';
import { RiCloseLine, RiAlertLine } from 'react-icons/ri';
import { createWorkRecord, updateWorkRecord } from '../../api/workApi';

const parseLocalTime = (time) => {
  if (!time) return { hour: 0, minute: 0 };
  if (typeof time === 'string') {
    const parts = time.split(':');
    return { hour: parseInt(parts[0], 10) || 0, minute: parseInt(parts[1], 10) || 0 };
  }
  if (Array.isArray(time)) {
    return { hour: time[0] || 0, minute: time[1] || 0 };
  }
  return { hour: time.hour || 0, minute: time.minute || 0 };
};

const RecordModal = ({
  show,
  onHide,
  isMobile,
  user,
  branches = [],
  mode = 'create', // 'create' | 'edit'
  targetRecord = null,
  initialData = null,
  onSuccess
}) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const [loading, setLoading] = useState(false);
  const [recDate, setRecDate] = useState(todayStr);
  const [startHour, setStartHour] = useState('18');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('22');
  const [endMin, setEndMin] = useState('00');
  const [restHour, setRestHour] = useState('00');
  const [restMin, setRestMin] = useState('00');
  const [isCustomRest, setIsCustomRest] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [workPlaceIdx, setWorkPlaceIdx] = useState(String(user?.workPlaceIdx || ''));
  const [editableUntil, setEditableUntil] = useState('');
  const [isEditable, setIsEditable] = useState(true);

  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (!show) return;

    if (isEditMode && targetRecord) {
      setRecDate(targetRecord.wrDate || todayStr);
      setWorkPlaceIdx(String(targetRecord.workPlaceIdx || user?.workPlaceIdx || ''));

      const st = parseLocalTime(targetRecord.wrStartTime);
      const et = parseLocalTime(targetRecord.wrEndTime);
      const rt = parseLocalTime(targetRecord.wrRestTime);

      setStartHour(String(st.hour).padStart(2, '0'));
      setStartMin(st.minute >= 15 && st.minute < 45 ? '30' : '00');

      setEndHour(String(et.hour).padStart(2, '0'));
      setEndMin(et.minute >= 15 && et.minute < 45 ? '30' : '00');

      const rHour = String(rt.hour).padStart(2, '0');
      const rMin = rt.minute >= 15 && rt.minute < 45 ? '30' : '00';
      setRestHour(rHour);
      setRestMin(rMin);

      const isStandard =
        (rHour === '00' && rMin === '00') ||
        (rHour === '02' && rMin === '30') ||
        (rHour === '03' && rMin === '00');
      setIsCustomRest(!isStandard);

      setRemarks(targetRecord.wrRemarks || '');
      const until = targetRecord.editableUntil || targetRecord.wrEditableUntil || '';
      setEditableUntil(until);
      setIsEditable(targetRecord.isEditable !== false && targetRecord.isEditable !== 0);
    } else {
      if (initialData) {
        setRecDate(initialData.recDate || todayStr);
        setWorkPlaceIdx(String(initialData.workPlaceIdx || user?.workPlaceIdx || ''));
        setStartHour(initialData.startHour || '18');
        setStartMin(initialData.startMin === '30' ? '30' : '00');
        setEndHour(initialData.endHour || '22');
        setEndMin(initialData.endMin === '30' ? '30' : '00');
      } else {
        setRecDate(todayStr);
        setWorkPlaceIdx(String(user?.workPlaceIdx || ''));
        setStartHour('18');
        setStartMin('00');
        setEndHour('22');
        setEndMin('00');
      }
      setRestHour('00');
      setRestMin('00');
      setIsCustomRest(false);
      setRemarks('');
      setEditableUntil('');
      setIsEditable(true);
    }
  }, [show, isEditMode, targetRecord, initialData, user?.workPlaceIdx]);

  // 실시간 총 근무시간 계산
  const computedTotalHours = useMemo(() => {
    const startNum = parseInt(startHour, 10) + (parseInt(startMin, 10) / 60);
    let endNum = parseInt(endHour, 10) + (parseInt(endMin, 10) / 60);
    if (endNum < startNum) endNum += 24;
    const workNum = endNum - startNum;
    const restNum = parseInt(restHour, 10) + (parseInt(restMin, 10) / 60);
    const isWarning = restNum >= workNum && workNum > 0;
    const total = Math.max(0, workNum - restNum).toFixed(1);
    return { total, isWarning };
  }, [startHour, startMin, endHour, endMin, restHour, restMin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (isEditMode && !isEditable) {
      alert('수정 기한이 지났습니다. 급여 담당자에게 직접 연락하세요.');
      return;
    }

    const startNum = parseInt(startHour, 10) + (parseInt(startMin, 10) / 60);
    let endNum = parseInt(endHour, 10) + (parseInt(endMin, 10) / 60);
    if (endNum < startNum) endNum += 24;
    const workNum = endNum - startNum;
    const restNum = parseInt(restHour, 10) + (parseInt(restMin, 10) / 60);

    if (restNum >= workNum) {
      alert('휴게 시간이 총 근무 시간 이상일 수 없습니다.');
      return;
    }

    if (!user?.userIdx) {
      alert('로그인 정보가 없습니다. 다시 로그인해 주세요.');
      return;
    }

    const recordData = {
      wrDate: recDate,
      wrStartTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
      wrEndTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
      wrRestTime: `${String(restHour).padStart(2, '0')}:${String(restMin).padStart(2, '0')}`,
      wrRemarks: remarks,
      userIdx: user.userIdx,
      workPlaceIdx: workPlaceIdx || user?.workPlaceIdx
    };

    setLoading(true);
    try {
      let res;
      if (isEditMode && targetRecord) {
        res = await updateWorkRecord(targetRecord.wrIdx, recordData);
      } else {
        res = await createWorkRecord(recordData);
      }

      if (res.success) {
        // 캐시 무효화
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('workRecordsCache_') || key.startsWith('workRecordsMonthlyCache_')) {
            sessionStorage.removeItem(key);
          }
        });
        alert(isEditMode ? '근무 기록이 수정되었습니다.' : '근무 기록이 추가되었습니다.');
        if (onSuccess) onSuccess();
        onHide();
      } else {
        alert(res.error || (isEditMode ? '근무 기록 수정에 실패했습니다.' : '근무 기록 추가에 실패했습니다.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formattedUntil = editableUntil
    ? format(typeof editableUntil === 'string' ? parseISO(editableUntil.split('T')[0]) : parseISO(String(editableUntil).slice(0, 10)), 'yyyy년 MM월 dd일')
    : null;

  const renderFormContent = (isSheet = false) => (
    <Form onSubmit={handleSubmit} className={isSheet ? "rec-sheet-form" : "d-flex flex-column h-100"}>
      <div className={isSheet ? "rec-sheet-body" : "p-4"}>
        {/* 수정 기한 배너 (수정 모드일 때만) */}
        {isEditMode && formattedUntil && (
          <div className={`rec-deadline-banner ${!isEditable ? 'is-expired' : ''}`}>
            <div className="d-flex align-items-center gap-1">
              {!isEditable && <RiAlertLine size={16} className="text-danger flex-shrink-0" />}
              <span className="fw-bold">수정 기한</span>
            </div>
            <span className="fw-semibold">
              {formattedUntil} 23:59까지
              {!isEditable && <span className="fw-bold ms-1 text-danger">(만료됨)</span>}
            </span>
          </div>
        )}

        {/* 1. 근무 날짜 & [오늘] [어제] 퀵 칩 */}
        <Form.Group className={isSheet ? "mb-0" : "mb-3"}>
          <Form.Label className="fw-bold text-muted small">근무 날짜</Form.Label>
          <div className="d-flex align-items-center gap-2">
            <Form.Control
              type="date"
              value={recDate}
              onChange={e => setRecDate(e.target.value)}
              required
              disabled={isEditMode && !isEditable}
              className="custom-input flex-grow-1"
            />
            {!isEditMode && (
              <div className="d-flex gap-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="light"
                  className={`rec-chip-btn ${recDate === todayStr ? 'active' : ''}`}
                  onClick={() => setRecDate(todayStr)}
                >
                  오늘
                </Button>
                <Button
                  type="button"
                  variant="light"
                  className={`rec-chip-btn ${recDate === yesterdayStr ? 'active' : ''}`}
                  onClick={() => setRecDate(yesterdayStr)}
                >
                  어제
                </Button>
              </div>
            )}
          </div>
        </Form.Group>

        {/* 2. 근무지 */}
        <Form.Group className={isSheet ? "mb-0" : "mb-3"}>
          <Form.Label className="fw-bold text-muted small">근무지</Form.Label>
          <Form.Select
            value={workPlaceIdx}
            onChange={e => setWorkPlaceIdx(e.target.value)}
            disabled={isEditMode && !isEditable}
            className="custom-input"
          >
            {branches.map(b => (
              <option key={b.wpIdx} value={String(b.wpIdx)}>
                {b.wpName}{String(b.wpIdx) === String(user?.workPlaceIdx) ? ' (내 지점)' : ''}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {/* 3. 출퇴근 시간 (시 0~23, 분 00/30 개별 셀렉트) */}
        <Form.Group className={isSheet ? "mb-0" : "mb-3"}>
          <Form.Label className="fw-bold text-muted small">출퇴근 시간</Form.Label>
          <div className="rec-time-box-container">
            {/* 출근 박스 */}
            <div className="rec-time-box">
              <span className="rec-time-box-label">출근</span>
              <div className="rec-time-selects">
                <select
                  value={startHour}
                  onChange={e => setStartHour(e.target.value)}
                  className="rec-time-select"
                  disabled={isEditMode && !isEditable}
                  aria-label="출근 시간(시)"
                >
                  {[...Array(24)].map((_, i) => {
                    const val = String(i).padStart(2, '0');
                    return <option key={val} value={val}>{val}시</option>;
                  })}
                </select>
                <span className="rec-time-colon">:</span>
                <select
                  value={startMin}
                  onChange={e => setStartMin(e.target.value)}
                  className="rec-time-select"
                  disabled={isEditMode && !isEditable}
                  aria-label="출근 시간(분)"
                >
                  <option value="00">00분</option>
                  <option value="30">30분</option>
                </select>
              </div>
            </div>

            <div className="rec-time-arrow">→</div>

            {/* 퇴근 박스 */}
            <div className="rec-time-box">
              <span className="rec-time-box-label">퇴근</span>
              <div className="rec-time-selects">
                <select
                  value={endHour}
                  onChange={e => setEndHour(e.target.value)}
                  className="rec-time-select"
                  disabled={isEditMode && !isEditable}
                  aria-label="퇴근 시간(시)"
                >
                  {[...Array(24)].map((_, i) => {
                    const val = String(i).padStart(2, '0');
                    return <option key={val} value={val}>{val}시</option>;
                  })}
                </select>
                <span className="rec-time-colon">:</span>
                <select
                  value={endMin}
                  onChange={e => setEndMin(e.target.value)}
                  className="rec-time-select"
                  disabled={isEditMode && !isEditable}
                  aria-label="퇴근 시간(분)"
                >
                  <option value="00">00분</option>
                  <option value="30">30분</option>
                </select>
              </div>
            </div>
          </div>
        </Form.Group>

        {/* 4. 휴게 시간 칩 */}
        <Form.Group className={isSheet ? "mb-0" : "mb-3"}>
          <Form.Label className="fw-bold text-muted small">휴게 시간</Form.Label>
          <div className="rec-break-chips mb-2">
            <Button
              type="button"
              variant="light"
              className={`rec-chip-btn ${!isCustomRest && restHour === '00' && restMin === '00' ? 'active' : ''}`}
              onClick={() => {
                if (isEditMode && !isEditable) return;
                setIsCustomRest(false);
                setRestHour('00');
                setRestMin('00');
              }}
              disabled={isEditMode && !isEditable}
            >
              없음
            </Button>
            <Button
              type="button"
              variant="light"
              className={`rec-chip-btn ${!isCustomRest && restHour === '02' && restMin === '30' ? 'active' : ''}`}
              onClick={() => {
                if (isEditMode && !isEditable) return;
                setIsCustomRest(false);
                setRestHour('02');
                setRestMin('30');
              }}
              disabled={isEditMode && !isEditable}
            >
              2시간 30분
            </Button>
            <Button
              type="button"
              variant="light"
              className={`rec-chip-btn ${!isCustomRest && restHour === '03' && restMin === '00' ? 'active' : ''}`}
              onClick={() => {
                if (isEditMode && !isEditable) return;
                setIsCustomRest(false);
                setRestHour('03');
                setRestMin('00');
              }}
              disabled={isEditMode && !isEditable}
            >
              3시간
            </Button>
            <Button
              type="button"
              variant="light"
              className={`rec-chip-btn ${isCustomRest ? 'active' : ''}`}
              onClick={() => {
                if (isEditMode && !isEditable) return;
                setIsCustomRest(true);
              }}
              disabled={isEditMode && !isEditable}
            >
              직접 입력
            </Button>
          </div>

          {isCustomRest && (
            <div className="d-flex gap-2 align-items-center mt-2">
              <Form.Select
                value={restHour}
                onChange={e => setRestHour(e.target.value)}
                className="custom-input flex-grow-1"
                aria-label="휴게 시간(시)"
                disabled={isEditMode && !isEditable}
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}시간</option>
                ))}
              </Form.Select>
              <span className="fw-bold text-muted">:</span>
              <Form.Select
                value={restMin}
                onChange={e => setRestMin(e.target.value)}
                className="custom-input flex-grow-1"
                aria-label="휴게 시간(분)"
                disabled={isEditMode && !isEditable}
              >
                {['00', '30'].map(m => (
                  <option key={m} value={m}>{m}분</option>
                ))}
              </Form.Select>
            </div>
          )}
        </Form.Group>

        {/* 5. 실시간 총 근무시간 계산 */}
        <div className={`rec-total-hours-card ${isSheet ? 'mb-0' : 'mb-3'} ${computedTotalHours.isWarning ? 'is-warning' : ''}`}>
          <div className="rec-total-text">
            총 근무시간 <span className="rec-total-val">{computedTotalHours.total}</span>시간
          </div>
          {computedTotalHours.isWarning && (
            <div className="text-danger small mt-1 fw-bold">
              휴게 시간이 총 근무 시간 이상일 수 없습니다.
            </div>
          )}
        </div>

        {/* 6. 비고 */}
        <Form.Group className="mb-0">
          <Form.Label className="fw-bold text-muted small">비고</Form.Label>
          <Form.Control
            type="text"
            placeholder="특이사항 입력"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            disabled={isEditMode && !isEditable}
            className="custom-input"
          />
        </Form.Group>
      </div>

      {/* 하단 고정 저장 버튼 */}
      <div className={isSheet ? "rec-sheet-footer" : "p-4 pt-0"}>
        <Button
          disabled={loading || (isEditMode && !isEditable) || computedTotalHours.isWarning}
          variant="primary"
          type="submit"
          className={isSheet ? "rec-submit-btn" : "w-100 py-3 fw-bold rounded-3"}
        >
          {loading ? '처리 중...' : (isEditMode ? '수정 완료' : '기록 저장')}
        </Button>
      </div>
    </Form>
  );

  const titleText = isEditMode ? '근무 기록 수정' : '새 근무 기록 추가';

  if (isMobile) {
    return (
      <Offcanvas
        show={show}
        onHide={onHide}
        placement="bottom"
        className="rec-bottom-sheet"
      >
        <div className="rec-sheet-header">
          <div className="d-flex flex-column w-100">
            <div className="rec-sheet-handle" />
            <div className="d-flex align-items-center justify-content-between">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.05rem' }}>{titleText}</h5>
              <Button
                type="button"
                variant="link"
                className="p-1 text-muted"
                onClick={onHide}
                aria-label="닫기"
              >
                <RiCloseLine size={24} />
              </Button>
            </div>
          </div>
        </div>
        {renderFormContent(true)}
      </Offcanvas>
    );
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="fw-bold text-dark">{titleText}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {renderFormContent(false)}
      </Modal.Body>
    </Modal>
  );
};

export default RecordModal;
