import { useState } from 'react';
import { Modal, Button, Table, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { RiUpload2Line, RiFileExcel2Line, RiCheckLine, RiAlertLine, RiInformationLine, RiBuilding4Line, RiUserLine } from 'react-icons/ri';
import * as XLSX from 'xlsx';
import { validateExcelWorkRecords, uploadExcelWorkRecords } from '../api/workApi';

const normalizeHeader = (header) => {
  if (!header) return '';
  const cleaned = String(header).replace(/\s+/g, '').trim().toLowerCase();
  
  // 날짜: 날짜, 일자
  if (['날짜', '일자', 'date', 'workdate'].includes(cleaned)) return 'workDate';
  // 이름: 이름, 성명
  if (['이름', '성명', 'name', 'username'].includes(cleaned)) return 'userName';
  // 출근: 출근, 출근시간, 시작시간
  if (['출근', '출근시간', '시작시간', 'starttime', 'start'].includes(cleaned)) return 'startTime';
  // 퇴근: 퇴근, 퇴근시간, 종료시간
  if (['퇴근', '퇴근시간', '종료시간', 'endtime', 'end'].includes(cleaned)) return 'endTime';
  // 휴게: 휴게, 휴게시간, 휴식
  if (['휴게', '휴게시간', '휴식', '휴식시간', 'breaktime', 'break'].includes(cleaned)) return 'breakTime';

  return null;
};

// 24시간제 HH:mm 변환 함수
const formatToHHmm = (val) => {
  if (val == null || val === '') return '';
  
  if (typeof val === 'number') {
    // 엑셀 시간 시리얼 넘버 (하루 1 = 24시간)
    if (val < 1) {
      const totalSeconds = Math.round(val * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    // 소수점이 아닌 900, 1830 형태일 경우
    const str = String(val).padStart(4, '0');
    return `${str.substring(0, 2)}:${str.substring(2, 4)}`;
  }

  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const [h, m] = str.split(':');
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(str)) {
    const [h, m] = str.split(':');
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  }
  return str;
};

// 날짜 포맷 (YYYY-MM-DD)
const formatDateVal = (val) => {
  if (!val) return '';
  if (typeof val === 'number') {
    // 엑셀 날짜 시리얼 넘버 파싱
    const jsDate = new Date((val - (25567 + 2)) * 86400 * 1000);
    const y = jsDate.getFullYear();
    const m = String(jsDate.getMonth() + 1).padStart(2, '0');
    const d = String(jsDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim().replace(/\./g, '-').replace(/\//g, '-');
  const parts = str.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
};

const AdminExcelUploadModal = ({ show, onHide, branches = [], onSuccess }) => {
  // step: 'select' | 'overwrite_confirm' | 'complete'
  const [step, setStep] = useState('select');
  const [parsedRecords, setParsedRecords] = useState([]);
  const [uniqueNames, setUniqueNames] = useState([]);
  const [detectedSheetNames, setDetectedSheetNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1단계 검증 결과
  const [validationResult, setValidationResult] = useState(null);

  // 2단계 완료 결과
  const [uploadResult, setUploadResult] = useState(null);

  // 모달 닫힐 때 초기화 및 메인 테이블 최신화
  const handleClose = () => {
    const isCompleted = step === 'complete';
    setStep('select');
    setParsedRecords([]);
    setUniqueNames([]);
    setDetectedSheetNames([]);
    setErrorMsg('');
    setValidationResult(null);
    setUploadResult(null);
    setLoading(false);
    onHide();
    if (isCompleted && onSuccess) {
      onSuccess();
    }
  };

  // 엑셀 파일 선택 및 파싱 (모든 시트 순회, 시트명 = workPlaceName)
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setErrorMsg('엑셀 파일에 시트가 존재하지 않습니다.');
          return;
        }

        const allRecords = [];
        const namesSet = new Set();
        const sheetList = [];

        // 다중 시트 순회
        for (const sheetName of workbook.SheetNames) {
          const trimmedSheetName = sheetName.trim();
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (!rows || rows.length < 2) continue; // 빈 시트는 건너뜀

          // 헤더 행 찾기
          let headerRowIndex = -1;
          for (let i = 0; i < rows.length; i++) {
            if (rows[i] && rows[i].some(cell => String(cell).trim() !== '')) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) continue;

          const rawHeaders = rows[headerRowIndex];
          const colMap = {};
          rawHeaders.forEach((h, idx) => {
            const norm = normalizeHeader(h);
            if (norm) colMap[norm] = idx;
          });

          // 필수 컬럼 확인
          const required = ['workDate', 'userName', 'startTime', 'endTime'];
          const missing = required.filter(col => colMap[col] === undefined);
          if (missing.length > 0) {
            // 이 시트는 양식 미부합
            continue;
          }

          let sheetRecordCount = 0;
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.every(cell => String(cell).trim() === '')) continue;

            const rawDate = row[colMap['workDate']];
            const rawName = row[colMap['userName']];
            const rawStart = row[colMap['startTime']];
            const rawEnd = row[colMap['endTime']];
            const rawBreak = colMap['breakTime'] !== undefined ? row[colMap['breakTime']] : '';

            const workDate = formatDateVal(rawDate);
            const userName = String(rawName || '').trim();
            const startTime = formatToHHmm(rawStart);
            const endTime = formatToHHmm(rawEnd);
            const breakTime = formatToHHmm(rawBreak);

            if (!userName || !workDate || !startTime || !endTime) continue;

            allRecords.push({
              workDate,
              userName,
              startTime,
              endTime,
              breakTime: breakTime || '00:00',
              workPlaceName: trimmedSheetName
            });

            namesSet.add(userName);
            sheetRecordCount++;
          }

          if (sheetRecordCount > 0) {
            sheetList.push(trimmedSheetName);
          }
        }

        if (allRecords.length === 0) {
          setErrorMsg('유효한 근무 기록 데이터를 찾을 수 없습니다. 시트별로 [날짜, 이름, 출근, 퇴근] 컬럼이 입력되어 있는지 확인해 주세요.');
          return;
        }

        setParsedRecords(allRecords);
        setUniqueNames(Array.from(namesSet));
        setDetectedSheetNames(sheetList);
      } catch (err) {
        console.error('엑셀 파싱 에러:', err);
        setErrorMsg('엑셀 파일을 읽는 도중 오류가 발생했습니다. 올바른 엑셀 형식인지 확인해 주세요.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // 1단계: 사전 검증 API 호출
  const handleValidateAndNext = async () => {
    if (parsedRecords.length === 0 || uniqueNames.length === 0) {
      setErrorMsg('업로드할 유효한 데이터가 없습니다.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const payload = {
      userNames: uniqueNames,
      workPlaceNames: detectedSheetNames,
      records: parsedRecords
    };

    const res = await validateExcelWorkRecords(payload);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || '엑셀 데이터 사전 검증에 실패했습니다.');
      return;
    }

    const { duplicateNames = [], invalidWorkPlaces = [], existingRecords = [] } = res.data;

    // 1) 동명이인 존재 시 업로드 차단
    if (duplicateNames.length > 0) {
      setErrorMsg(
        `동일한 이름의 사용자가 여러 명 존재하여 식별할 수 없습니다. 업로드 전 직원 관리에서 동명이인의 이름을 구분(예: 이름#1)해 주세요. (대상자: ${duplicateNames.join(', ')})`
      );
      return;
    }

    // 2) 미등록 근무지 시트명 존재 시 업로드 차단
    if (invalidWorkPlaces.length > 0) {
      setErrorMsg(
        `시스템에 등록되지 않은 근무지 시트가 포함되어 있습니다: [${invalidWorkPlaces.join(', ')}]. 시트명을 실제 등록된 근무지명과 일치시켜 주세요.`
      );
      return;
    }

    setValidationResult(res.data);

    // 3) 기존 동일 날짜 기록이 존재하는 경우 -> 덮어쓰기 확인 팝업 단계로 이동
    if (existingRecords.length > 0) {
      setStep('overwrite_confirm');
    } else {
      // 중복 없음 -> 바로 최종 등록 실행
      executeUpload(false);
    }
  };

  // 2단계: 최종 등록 API 호출
  const executeUpload = async (overwriteExisting) => {
    setLoading(true);
    setErrorMsg('');

    const payload = {
      overwriteExisting,
      records: parsedRecords
    };

    const res = await uploadExcelWorkRecords(payload);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || '근무기록 일괄 등록에 실패했습니다.');
      return;
    }

    setUploadResult(res.data);
    setStep('complete');
  };

  // 샘플 엑셀 다운로드 (동적 근무지 시트 다중 생성)
  const handleDownloadSample = () => {
    const wb = XLSX.utils.book_new();
    const sheetNamesToCreate = branches.filter(b => b.wpName && b.wpIdx != null).map(b => b.wpName);
    
    // 지점 목록이 없을 경우 기본값
    const sampleSheets = sheetNamesToCreate.length > 0 ? sheetNamesToCreate : ['노란돼지', '약산돼지', 'test'];

    sampleSheets.forEach(sheetName => {
      const sampleData = [
        ['날짜', '이름', '출근', '퇴근', '휴게'],
        ['2026-09-21', '김철수', '09:00', '18:00', '01:00'],
        ['2026-09-22', '이영희', '22:00', '04:00', '00:30']
      ];
      const ws = XLSX.utils.aoa_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, '00_근무기록_업로드양식(템플릿).xlsx');
  };

  return (
    <Modal show={show} onHide={handleClose} centered size={step === 'overwrite_confirm' ? 'lg' : 'md'}>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold d-flex align-items-center gap-2">
          <RiFileExcel2Line className="text-success" />
          {step === 'select' && '근무 기록 엑셀 일괄 등록'}
          {step === 'overwrite_confirm' && '기존 근무 기록 중복 확인'}
          {step === 'complete' && '근무 기록 등록 완료'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-3">
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} className="mb-3" />
            <h6 className="fw-bold text-dark mb-1">
              {step === 'overwrite_confirm' ? '근무 기록을 일괄 등록(반영)하는 중입니다...' : '엑셀 데이터 검증 및 등록 처리 중입니다...'}
            </h6>
            <p className="text-muted small mb-0">대용량 데이터이거나 신규 사원 생성 시 수 초 정도 소요될 수 있습니다. 잠시만 기다려 주세요.</p>
          </div>
        )}

        {!loading && errorMsg && (
          <Alert variant="danger" className="d-flex align-items-start gap-2 py-2 mb-3">
            <RiAlertLine className="mt-1 flex-shrink-0" size={18} />
            <div style={{ wordBreak: 'keep-all' }}>{errorMsg}</div>
          </Alert>
        )}

        {/* 1단계: 파일 선택 & 파싱 미리보기 */}
        {!loading && step === 'select' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded-3 border">
              <div>
                <div className="fw-bold small text-dark mb-1">엑셀 파일 규격 안내</div>
                <div className="text-muted" style={{ fontSize: '0.84rem' }}>
                  • <strong>시트명 = 근무지명</strong><br />
                  • 컬럼 순서: <strong>날짜, 이름, 출근, 퇴근, 휴게</strong><br />
                  • 시간은 24시간제(09:00, 18:30)
                </div>
              </div>
              <Button
                variant="outline-secondary"
                size="sm"
                className="fw-bold text-nowrap rounded-pill px-3"
                onClick={handleDownloadSample}
              >
                양식 다운로드
              </Button>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted">엑셀 파일 선택 (.xlsx, .xls)</Form.Label>
              <Form.Control
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                disabled={loading}
              />
            </Form.Group>

            {parsedRecords.length > 0 && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-bold text-dark small">
                    파싱 완료 <Badge bg="primary">{parsedRecords.length}건</Badge>{' '}
                    <Badge bg="secondary">근무자 {uniqueNames.length}명</Badge>{' '}
                    <Badge bg="success">시트 {detectedSheetNames.length}개</Badge>
                  </div>
                  <small className="text-muted">(상위 5건 미리보기)</small>
                </div>

                <div className="d-flex gap-1 flex-wrap mb-2">
                  {detectedSheetNames.map(s => (
                    <Badge key={s} bg="light" text="dark" className="border px-2 py-1">
                      <RiBuilding4Line className="me-1 text-primary" />{s}
                    </Badge>
                  ))}
                </div>

                <div className="table-responsive border rounded-3" style={{ maxHeight: '180px' }}>
                  <Table size="sm" hover className="mb-0 text-center align-middle" style={{ fontSize: '0.83rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th>근무지(시트)</th>
                        <th>날짜</th>
                        <th>이름</th>
                        <th>출근</th>
                        <th>퇴근</th>
                        <th>휴게</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRecords.slice(0, 5).map((rec, i) => (
                        <tr key={i}>
                          <td className="fw-bold text-secondary">{rec.workPlaceName}</td>
                          <td>{rec.workDate}</td>
                          <td className="fw-bold">{rec.userName}</td>
                          <td>{rec.startTime}</td>
                          <td>{rec.endTime}</td>
                          <td>{rec.breakTime || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2단계: 기존 동일 날짜 기록 중복 확인 (덮어쓰기 or 건너뛰기) */}
        {!loading && step === 'overwrite_confirm' && validationResult && (
          <div>
            <Alert variant="warning" className="d-flex align-items-start gap-2 py-2 mb-3">
              <RiInformationLine size={20} className="mt-1 flex-shrink-0 text-warning" />
              <div style={{ fontSize: '0.88rem' }}>
                동일한 날짜에 이미 등록되어 있는 근무 기록 <strong>{validationResult.existingRecords?.length}건</strong>이 발견되었습니다.<br />
                기존 기록을 엑셀 내용으로 <strong>덮어쓰시겠습니까</strong>, 아니면 신규 건만 등록하고 중복 건은 <strong>건너뛰시겠습니까</strong>?
              </div>
            </Alert>

            <div className="table-responsive border rounded-3 mb-2" style={{ maxHeight: '220px' }}>
              <Table size="sm" hover className="mb-0 align-middle text-center" style={{ fontSize: '0.82rem' }}>
                <thead className="table-light">
                  <tr>
                    <th>날짜</th>
                    <th>이름</th>
                    <th>근무지</th>
                    <th>기존 기록</th>
                    <th>엑셀 변경 내용</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.existingRecords?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.workDate}</td>
                      <td className="fw-bold">{item.userName}</td>
                      <td>{item.workPlaceName}</td>
                      <td className="text-muted">
                        {item.currentStartTime} ~ {item.currentEndTime}
                        {item.currentBreakTime ? ` (${item.currentBreakTime})` : ''}
                      </td>
                      <td className="text-primary fw-bold">
                        {item.excelStartTime} ~ {item.excelEndTime}
                        {item.excelBreakTime ? ` (${item.excelBreakTime})` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <div className="text-end text-muted small">
              ※ 신규 추가 예정 인원: <strong>{validationResult.newUsers?.length || 0}명</strong>, 기존 사원: <strong>{validationResult.existingUsers?.length || 0}명</strong>
            </div>
          </div>
        )}

        {/* 3단계: 완료 화면 */}
        {!loading && step === 'complete' && uploadResult && (
          <div className="text-center py-2">
            <div
              className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3"
              style={{ width: '52px', height: '52px' }}
            >
              <RiCheckLine size={30} />
            </div>
            <h5 className="fw-bold text-dark mb-1">근무 기록 등록 완료</h5>
            <p className="text-muted small mb-3">
              {uploadResult.message || `총 ${uploadResult.totalRecordsCount || parsedRecords.length}건 처리가 완료되었습니다.`}
            </p>

            <div className="bg-light p-3 rounded-3 text-start mb-3 border">
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">총 처리 건수:</span>
                <span className="fw-bold text-dark">{uploadResult.totalRecordsCount ?? parsedRecords.length}건</span>
              </div>
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">신규 추가 건수:</span>
                <span className="fw-bold text-success">+{uploadResult.insertedRecordsCount ?? 0}건</span>
              </div>
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">덮어쓰기(수정) 건수:</span>
                <span className="fw-bold text-primary">{uploadResult.updatedRecordsCount ?? 0}건</span>
              </div>
              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-muted">건너뛴 건수:</span>
                <span className="fw-bold text-secondary">{uploadResult.skippedRecordsCount ?? 0}건</span>
              </div>

              {/* 지점별 등록 건수 집계 */}
              {uploadResult.workPlaceRecordCounts && Object.keys(uploadResult.workPlaceRecordCounts).length > 0 && (
                <div className="mt-2 pt-2 border-top">
                  <div className="fw-bold small text-dark mb-1 d-flex align-items-center gap-1">
                    <RiBuilding4Line className="text-primary" /> 지점별 등록 건수
                  </div>
                  <div className="d-flex gap-2 flex-wrap mb-2">
                    {Object.entries(uploadResult.workPlaceRecordCounts).map(([wp, cnt]) => (
                      <Badge key={wp} bg="white" text="dark" className="border px-2 py-1 shadow-xs">
                        <strong>{wp}</strong>: <span className="text-primary">{cnt}건</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 인원별 등록 건수 집계 */}
              {uploadResult.userRecordCounts && Object.keys(uploadResult.userRecordCounts).length > 0 && (
                <div className="mt-2 pt-2 border-top">
                  <div className="fw-bold small text-dark mb-1 d-flex align-items-center gap-1">
                    <RiUserLine className="text-secondary" /> 사원별 처리 건수
                  </div>
                  <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                    {Object.entries(uploadResult.userRecordCounts).map(([name, count]) => (
                      <div key={name} className="d-flex justify-content-between small text-secondary py-1">
                        <span>{name}</span>
                        <span>{count}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0">
        {step === 'select' && (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleValidateAndNext}
              disabled={loading || parsedRecords.length === 0}
              className="fw-bold d-inline-flex align-items-center gap-1"
            >
              {loading ? <Spinner size="sm" animation="border" /> : <RiUpload2Line />}
              {loading ? '검증 및 업로드 분석 중...' : '다음 단계 (사전 검증)'}
            </Button>
          </>
        )}

        {step === 'overwrite_confirm' && (
          <div className="w-100 d-flex justify-content-between align-items-center">
            <Button variant="outline-secondary" onClick={() => setStep('select')} disabled={loading} size="sm">
              이전으로
            </Button>
            <div className="d-flex gap-2">
              <Button
                variant="secondary"
                onClick={() => executeUpload(false)}
                disabled={loading}
                className="fw-bold"
              >
                {loading ? <Spinner size="sm" animation="border" /> : null} 중복 건너뛰고 등록
              </Button>
              <Button
                variant="danger"
                onClick={() => executeUpload(true)}
                disabled={loading}
                className="fw-bold"
              >
                {loading ? <Spinner size="sm" animation="border" /> : null} 기존 기록 덮어쓰기
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <Button variant="primary" className="w-100 fw-bold py-2" onClick={handleClose}>
            확인
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default AdminExcelUploadModal;
