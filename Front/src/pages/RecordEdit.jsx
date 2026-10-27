import React, { useState, useEffect, useMemo } from 'react';
import { Container, Form, Button, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { RiArrowLeftSLine, RiSave3Line, RiAlertLine } from 'react-icons/ri';
import { fetchWorkRecordById, updateWorkRecord } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import useAuthStore from '../store/useAuthStore';
import Loading from '../components/Loading';
import './Main.css';
import './Records.css';

const RecordEdit = () => {
  const location = useLocation();
  const id = location.state?.id;
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [recDate, setRecDate] = useState('');
  const [startHour, setStartHour] = useState('18');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('22');
  const [endMin, setEndMin] = useState('00');
  const [restHour, setRestHour] = useState('00');
  const [restMin, setRestMin] = useState('00');
  const [isCustomRest, setIsCustomRest] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [workPlaceIdx, setWorkPlaceIdx] = useState(String(user?.workPlaceIdx || ''));
  const [branches, setBranches] = useState([]);
  const [editableUntil, setEditableUntil] = useState('');
  const [isEditable, setIsEditable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (!id) {
      alert('잘못된 접근입니다.');
      navigate('/records');
      return;
    }

    const loadRecord = async () => {
      const res = await fetchWorkRecordById(id);
      if (res.success && res.data) {
        setRecDate(res.data.wrDate || '');
        const st = parseLocalTime(res.data.wrStartTime);
        const et = parseLocalTime(res.data.wrEndTime);
        const rt = parseLocalTime(res.data.wrRestTime);

        setStartHour(String(st.hour).padStart(2, '0'));
        setStartMin(String(st.minute).padStart(2, '0'));
        setEndHour(String(et.hour).padStart(2, '0'));
        setEndMin(String(et.minute).padStart(2, '0'));

        const rHour = String(rt.hour).padStart(2, '0');
        const rMin = String(rt.minute).padStart(2, '0');
        setRestHour(rHour);
        setRestMin(rMin);

        // 휴게 시간이 표준 칩(0분, 2시간 30분, 3시간)에 맞는지 확인, 아니면 직접 입력 활성화
        const isStandard =
          (rHour === '00' && rMin === '00') ||
          (rHour === '02' && rMin === '30') ||
          (rHour === '03' && rMin === '00');
        setIsCustomRest(!isStandard);

        setRemarks(res.data.wrRemarks || '');
        const until = res.data.editableUntil || res.data.wrEditableUntil || '';
        setEditableUntil(until);
        setIsEditable(res.data.isEditable !== false && res.data.isEditable !== 0);

        if (res.data.workPlaceIdx) {
          setWorkPlaceIdx(String(res.data.workPlaceIdx));
        } else if (user?.workPlaceIdx) {
          setWorkPlaceIdx(String(user.workPlaceIdx));
        }
      } else {
        alert(res.error || '기록을 불러오는데 실패했습니다.');
        navigate('/records');
      }
      setLoading(false);
    };

    loadRecord();
  }, [id, navigate, user?.workPlaceIdx]);

  useEffect(() => {
    fetchWorkPlaces().then(res => {
      if (res.success && res.data) {
        setBranches(res.data);
      }
    });
  }, []);

  // 실시간 총 근무시간 계산 (익일 퇴근 시 24시간 가산)
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

  const handleStartTimeChange = (val) => {
    if (!val) return;
    const [h, m] = val.split(':');
    setStartHour(h || '00');
    setStartMin(m || '00');
  };

  const handleEndTimeChange = (val) => {
    if (!val) return;
    const [h, m] = val.split(':');
    setEndHour(h || '00');
    setEndMin(m || '00');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!isEditable) {
      alert('수정 기한이 지났습니다. 급여 담당자에게 직접 연락하세요.');
      return;
    }
    if (!recDate) {
      alert('날짜를 선택해주세요.');
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

    const recordData = {
      wrDate: recDate,
      wrStartTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
      wrEndTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
      wrRestTime: `${String(restHour).padStart(2, '0')}:${String(restMin).padStart(2, '0')}`,
      wrRemarks: remarks,
      userIdx: user?.userIdx || 1,
      workPlaceIdx: workPlaceIdx || user?.workPlaceIdx
    };

    setIsSubmitting(true);
    try {
      const res = await updateWorkRecord(id, recordData);
      if (res.success) {
        // 캐시 무효화
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('workRecordsCache_') || key.startsWith('workRecordsMonthlyCache_')) {
            sessionStorage.removeItem(key);
          }
        });
        alert('근무 기록이 수정되었습니다.');
        navigate('/records');
      } else {
        alert(res.error || '근무 기록 수정에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5" style={{ minHeight: '60vh' }}>
        <Loading />
      </Container>
    );
  }

  const formattedUntil = editableUntil
    ? format(typeof editableUntil === 'string' ? parseISO(editableUntil.split('T')[0]) : parseISO(String(editableUntil).slice(0, 10)), 'yyyy년 MM월 dd일')
    : null;

  return (
    <Container className="py-3 py-md-4 mb-5" style={{ maxWidth: '540px' }}>
      {/* 상단 헤더 */}
      <div className="d-flex align-items-center mb-3 gap-2">
        <button
          type="button"
          className="rec-month-arrow-btn"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
        >
          <RiArrowLeftSLine size={24} />
        </button>
        <h4 className="fw-bold text-dark mb-0 fs-5">근무 기록 수정</h4>
      </div>

      {/* 수정 기한 배너 */}
      {formattedUntil && (
        <div className={`rec-deadline-banner mb-3 ${!isEditable ? 'is-expired' : ''}`}>
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

      {/* 수정 폼 카드 */}
      <div className="rec-edit-card">
        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {/* 1. 근무 일자 */}
          <Form.Group>
            <Form.Label className="fw-bold text-muted small">근무 일자</Form.Label>
            <Form.Control
              type="date"
              value={recDate}
              onChange={(e) => setRecDate(e.target.value)}
              className="custom-input"
              disabled={!isEditable}
              required
            />
          </Form.Group>

          {/* 2. 근무지 */}
          <Form.Group>
            <Form.Label className="fw-bold text-muted small">근무지</Form.Label>
            <Form.Select
              value={workPlaceIdx}
              onChange={e => setWorkPlaceIdx(e.target.value)}
              className="custom-input"
              disabled={!isEditable}
            >
              {branches.map(b => (
                <option key={b.wpIdx} value={String(b.wpIdx)}>
                  {b.wpName}{String(b.wpIdx) === String(user?.workPlaceIdx) ? ' (내 지점)' : ''}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* 3. 출퇴근 시간 (시 0~23, 분 00/30 개별 셀렉트) */}
          <Form.Group>
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
                    disabled={!isEditable}
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
                    disabled={!isEditable}
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
                    disabled={!isEditable}
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
                    disabled={!isEditable}
                    aria-label="퇴근 시간(분)"
                  >
                    <option value="00">00분</option>
                    <option value="30">30분</option>
                  </select>
                </div>
              </div>
            </div>
          </Form.Group>

          {/* 4. 휴게 시간 4종 칩 */}
          <Form.Group>
            <Form.Label className="fw-bold text-muted small">휴게 시간</Form.Label>
            <div className="rec-break-chips mb-2">
              <Button
                type="button"
                variant="light"
                className={`rec-chip-btn ${!isCustomRest && restHour === '00' && restMin === '00' ? 'active' : ''}`}
                onClick={() => {
                  if (!isEditable) return;
                  setIsCustomRest(false);
                  setRestHour('00');
                  setRestMin('00');
                }}
                disabled={!isEditable}
              >
                없음
              </Button>
              <Button
                type="button"
                variant="light"
                className={`rec-chip-btn ${!isCustomRest && restHour === '02' && restMin === '30' ? 'active' : ''}`}
                onClick={() => {
                  if (!isEditable) return;
                  setIsCustomRest(false);
                  setRestHour('02');
                  setRestMin('30');
                }}
                disabled={!isEditable}
              >
                2시간 30분
              </Button>
              <Button
                type="button"
                variant="light"
                className={`rec-chip-btn ${!isCustomRest && restHour === '03' && restMin === '00' ? 'active' : ''}`}
                onClick={() => {
                  if (!isEditable) return;
                  setIsCustomRest(false);
                  setRestHour('03');
                  setRestMin('00');
                }}
                disabled={!isEditable}
              >
                3시간
              </Button>
              <Button
                type="button"
                variant="light"
                className={`rec-chip-btn ${isCustomRest ? 'active' : ''}`}
                onClick={() => {
                  if (!isEditable) return;
                  setIsCustomRest(true);
                }}
                disabled={!isEditable}
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
                  disabled={!isEditable}
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
                  disabled={!isEditable}
                >
                  {['00', '30'].map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </Form.Select>
              </div>
            )}
          </Form.Group>

          {/* 5. 실시간 총 근무시간 계산 카드 */}
          <div className={`rec-total-hours-card ${computedTotalHours.isWarning ? 'is-warning' : ''}`}>
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
          <Form.Group>
            <Form.Label className="fw-bold text-muted small">비고</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="특이사항이 있다면 적어주세요."
              className="custom-input"
              disabled={!isEditable}
            />
          </Form.Group>

          {/* 7. 수정 완료 버튼 */}
          <Button
            variant="primary"
            type="submit"
            className="rec-submit-btn mt-2 d-flex align-items-center justify-content-center gap-2"
            disabled={isSubmitting || !isEditable || computedTotalHours.isWarning}
          >
            {isSubmitting ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span>처리 중...</span>
              </>
            ) : (
              <>
                <RiSave3Line size={20} />
                <span>수정 완료</span>
              </>
            )}
          </Button>
        </Form>
      </div>
    </Container>
  );
};

export default RecordEdit;
