import { useMemo, useState, useEffect } from 'react';
import { Alert, Badge, Button, Container, Form, Spinner, Modal, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  RiArrowLeftSLine,
  RiDownload2Line,
  RiFileExcel2Line,
  RiUpload2Line,
} from 'react-icons/ri';
import {
  downloadExcelCompareResult,
  downloadExcelCompareTemplate,
  startExcelCompare,
  getExcelCompareStatus,
} from '../api/workApi';
import useSyncExcelDownloadProgress from '../hooks/useSyncExcelDownloadProgress';
import './AdminMain.css';

/** 결과 상태 표시 순서·라벨 (Back statusCounts 키와 동일) */
const STATUS_META = [
  { key: 'USER_NOT_FOUND', label: '유저 없음', variant: 'dark' },
  { key: 'AMBIGUOUS', label: '동명이인 미확정', variant: 'warning' },
  { key: 'MISSING_IN_DB', label: '엑셀만 있음', variant: 'info' },
  { key: 'ONLY_IN_DB', label: 'DB만 있음', variant: 'secondary' },
  { key: 'MISMATCH_TIME', label: '시간 불일치', variant: 'danger' },
  { key: 'MISMATCH_WORKPLACE', label: '근무지 불일치', variant: 'danger' },
  { key: 'MATCH', label: '일치', variant: 'success' },
];

const AdminExcelCompare = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [statusCounts, setStatusCounts] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [progress, setProgress] = useState(0);
  const {
    busy: excelDlBusy,
    runDownload: runExcelDownload,
    ProgressModal: ExcelDownloadProgressModal,
  } = useSyncExcelDownloadProgress({
    title: '엑셀 다운로드 중...',
  });

  const yearMonth = useMemo(() => {
    if (!selectedMonth) return { year: null, month: null };
    const [y, m] = selectedMonth.split('-');
    return { year: parseInt(y, 10), month: parseInt(m, 10) };
  }, [selectedMonth]);

  const resetResult = () => {
    setPhase(null);
    setSessionId(null);
    setMessages([]);
    setStatusCounts(null);
    setTotalCount(null);
    setProgress(0);
  };

  const applyPhaseResult = (res) => {
    const nextPhase = res.phase || null;
    setPhase(nextPhase);
    setSessionId(res.sessionId || null);
    setMessages(res.messages || []);
    setStatusCounts(res.statusCounts || null);
    setTotalCount(res.totalCount != null ? res.totalCount : null);
    const pct = res.progress != null ? Number(res.progress) : 0;
    setProgress(nextPhase === 'DONE' ? Math.max(pct, 100) : pct);
  };

  useEffect(() => {
    let intervalId;
    if (phase === 'PROCESSING' && sessionId) {
      intervalId = setInterval(async () => {
        const res = await getExcelCompareStatus(sessionId);
        if (res.success) {
          applyPhaseResult(res);
          if (res.phase !== 'PROCESSING') {
            clearInterval(intervalId);
          }
        } else {
          clearInterval(intervalId);
          setPhase('ERROR');
          setMessages([res.error || '상태 확인 중 오류가 발생했습니다.']);
        }
      }, 1500);
    }
    return () => clearInterval(intervalId);
  }, [phase, sessionId]);

  const handleTemplate = async () => {
    if (busy || excelDlBusy) return;
    await runExcelDownload(
      ({ signal }) => downloadExcelCompareTemplate({ signal }),
      { title: '대조 템플릿 다운로드 중...', fallbackError: '템플릿 다운로드에 실패했습니다.' }
    );
  };

  const handleStart = async () => {
    if (busy || excelDlBusy) return;
    if (!file) {
      alert('대조할 엑셀 파일을 선택해주세요.');
      return;
    }
    if (!yearMonth.year || !yearMonth.month) {
      alert('대조할 연·월을 선택해주세요.');
      return;
    }
    setBusy(true);
    resetResult();
    // POST 대기 중에도 대조와 동일 톤의 진행 모달(0%) 표시
    setPhase('PROCESSING');
    setProgress(0);

    const res = await startExcelCompare(file, yearMonth.year, yearMonth.month);
    setBusy(false);

    if (res.phase === 'COLUMN_ERROR') {
      applyPhaseResult(res);
      return;
    }
    if (!res.success) {
      // 413/507 등: 세션 없이 BE msg 노출 (업로드 시작 단계)
      setPhase('ERROR');
      setSessionId(null);
      setProgress(0);
      setMessages([res.error || '엑셀 대조에 실패했습니다. 세션이 만료됐다면 다시 업로드해 주세요.']);
      return;
    }
    applyPhaseResult(res);
  };

  const handleDownloadResult = async () => {
    if (busy || excelDlBusy) return;
    if (!sessionId) {
      alert('세션이 없습니다. 파일을 다시 업로드해 주세요.');
      return;
    }
    await runExcelDownload(
      ({ signal }) =>
        downloadExcelCompareResult(sessionId, yearMonth.year, yearMonth.month, { signal }),
      {
        title: '대조 결과 다운로드 중...',
        fallbackError: '결과 다운로드에 실패했습니다. 세션이 만료됐다면 다시 업로드해 주세요.',
      }
    );
  };

  const statusRows = STATUS_META
    .map((meta) => ({ ...meta, count: statusCounts?.[meta.key] }))
    .filter((row) => row.count != null && row.count > 0);

  const issueCount = statusRows
    .filter((row) => row.key !== 'MATCH')
    .reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="admin-container">
      <Container fluid className="py-4 py-md-5 px-3 px-md-4">
        <div className="admin-header-card">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
            <div>
              <Button
                as={Link}
                to="/admin/records"
                variant="link"
                className="text-decoration-none text-muted p-0 mb-2 d-inline-flex align-items-center gap-1"
              >
                <RiArrowLeftSLine size={18} /> 근무 기록으로
              </Button>
              <h2 className="fw-bold text-dark mb-1">근무 기록 엑셀 대조</h2>
              <p className="text-muted small mb-0">
                템플릿으로 작성한 엑셀을 올리면 서버가 대조합니다. DB는 덮어쓰지 않습니다.
                동명이인·불일치는 결과 엑셀의 상태 태그로 확인합니다. 세션은 약 2시간 유효합니다.
              </p>
            </div>
          </div>

          <hr className="my-3 opacity-25" />

          <div className="d-flex flex-wrap align-items-end gap-3">
            <Form.Group>
              <Form.Label className="small fw-bold text-muted mb-1">대조 연·월</Form.Label>
              <Form.Control
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  resetResult();
                }}
                className="custom-input py-2 fw-bold text-primary"
                style={{ width: '160px' }}
              />
            </Form.Group>

            <Button
              variant="outline-success"
              className="fw-bold rounded-pill px-3 py-2"
              onClick={handleTemplate}
              disabled={busy || excelDlBusy}
            >
              <RiDownload2Line className="me-1" />
              템플릿 받기
            </Button>

            <Form.Group className="flex-grow-1" style={{ minWidth: '220px' }}>
              <Form.Label className="small fw-bold text-muted mb-1">
                업로드 파일 (날짜, 이름, 근무지, 출근, 퇴근, 휴게)
              </Form.Label>
              <Form.Control
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  resetResult();
                }}
              />
            </Form.Group>

            <Button
              variant="primary"
              className="fw-bold rounded-pill px-3 py-2"
              onClick={handleStart}
              disabled={busy || excelDlBusy || !file}
            >
              {busy ? <Spinner size="sm" className="me-1" /> : <RiUpload2Line className="me-1" />}
              대조 시작
            </Button>
          </div>
        </div>

        {phase === 'COLUMN_ERROR' && (
          <Alert variant="danger" className="mt-4">
            <div className="fw-bold mb-2">컬럼 오류 — 대조를 중단했습니다</div>
            <ul className="mb-0 ps-3">
              {(messages.length ? messages : ['헤더 형식을 확인해 주세요.']).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
            <div className="small mt-2 mb-0">
              필수 헤더: 날짜, 이름, 근무지, 출근, 퇴근, 휴게 (시트 = 근무지, 시트 순서 = wpIdx 오름차순)
            </div>
          </Alert>
        )}

        {phase === 'ERROR' && (
          <Alert variant="danger" className="mt-4">
            <div className="fw-bold mb-2">대조 실패</div>
            <ul className="mb-0 ps-3">
              {(messages.length ? messages : ['서버 내부 오류가 발생했습니다.']).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </Alert>
        )}

        {phase === 'DONE' && (
          <div className="admin-header-card mt-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
              <div>
                <h5 className="fw-bold mb-1">대조 완료</h5>
                <p className="text-muted small mb-0">
                  결과 엑셀을 다운로드해 상태 태그로 확인하세요. DB는 변경되지 않았습니다.
                  {totalCount != null && (
                    <> 결과 행 <strong>{totalCount}</strong>건
                      {issueCount > 0 && (
                        <> · 확인 필요 <strong className="text-danger">{issueCount}</strong>건</>
                      )}
                    </>
                  )}
                </p>
              </div>
              <Button
                variant="success"
                className="fw-bold rounded-pill px-3"
                onClick={handleDownloadResult}
                disabled={busy || excelDlBusy || !sessionId}
              >
                {busy ? <Spinner size="sm" className="me-1" /> : <RiFileExcel2Line className="me-1" />}
                결과 다운로드
              </Button>
            </div>

            {statusRows.length > 0 ? (
              <div className="d-flex flex-wrap gap-2">
                {statusRows.map((row) => (
                  <div
                    key={row.key}
                    className="d-flex align-items-center gap-2 border rounded-3 px-3 py-2 bg-white"
                  >
                    <Badge bg={row.variant}>{row.label}</Badge>
                    <span className="fw-bold">{row.count}</span>
                    <span className="small text-muted">{row.key}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted small">상태별 건수 정보가 없습니다. 결과 엑셀을 내려받아 확인하세요.</div>
            )}

            {statusCounts?.AMBIGUOUS > 0 && (
              <Alert variant="warning" className="mt-3 mb-0 py-2 small">
                동명이인·전부일치 2명 이상인 행이 있습니다. 결과 엑셀의 <strong>AMBIGUOUS</strong> 태그를 직접 확인하세요.
              </Alert>
            )}
          </div>
        )}

        {!phase && (
          <div className="text-muted small mt-4">
            <Badge bg="secondary" className="me-2">안내</Badge>
            비교·파싱은 서버에서만 수행합니다. 브라우저는 엑셀을 읽지 않습니다.
          </div>
        )}
      </Container>

      <Modal show={phase === 'PROCESSING'} backdrop="static" keyboard={false} centered>
        <Modal.Body className="text-center py-5">
          <h5 className="fw-bold mb-3">
            {sessionId ? '엑셀 대조 중...' : '엑셀 업로드 중...'}
          </h5>
          <p className="text-muted small mb-4">대용량 파일의 경우 시간이 걸릴 수 있습니다.</p>
          <ProgressBar
            animated
            now={Math.max(0, Math.min(100, Math.round(progress || 0)))}
            label={`${Math.max(0, Math.min(100, Math.round(progress || 0)))}%`}
            style={{ height: '25px' }}
          />
        </Modal.Body>
      </Modal>

      {ExcelDownloadProgressModal}
    </div>
  );
};

export default AdminExcelCompare;
