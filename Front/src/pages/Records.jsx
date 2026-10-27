import React, { useState, useEffect, useMemo } from 'react';
import { Container } from 'react-bootstrap';
import {
  format,
  subMonths,
  addMonths,
  isBefore,
  isSameDay,
  startOfDay,
  parseISO,
  isWeekend,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { RiCalendarCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { isHoliday } from 'korean-holidays';
import useAuthStore from '../store/useAuthStore';
import { getMonthlyWorkRecords, getMonthlyWorkApplyWorks } from '../api/workApi';
import { globalApiClient } from '../api/apiClient';
import { fetchWorkPlaces } from '../api/authApi';
import Loading from '../components/Loading';
import PaginationBar from '../components/PaginationBar';
import RecordMonthNavigator from '../components/records/RecordMonthNavigator';
import RecordStatSummary from '../components/records/RecordStatSummary';
import RecordListItem, { calculateTotalHours } from '../components/records/RecordListItem';
import RecordModal from '../components/records/RecordModal';
import './Main.css';
import './Records.css';

const Records = () => {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [records, setRecords] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editTargetRecord, setEditTargetRecord] = useState(null);
  const [modalInitialData, setModalInitialData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(5);
  const [pageInput, setPageInput] = useState("1");
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  // 모바일 화면 분기 (기준: 450px)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 450);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 450);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const parseDateStr = (dateObj) => {
    if (!dateObj) return new Date();
    if (typeof dateObj === 'string') {
      const parts = dateObj.split('T')[0].split('-');
      if (parts.length === 3) return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return parseISO(dateObj);
    }
    if (Array.isArray(dateObj)) {
      const [y, m, d] = dateObj;
      return new Date(y, m - 1, d);
    }
    return new Date(dateObj);
  };

  const loadRecords = async (monthStr) => {
    setDataLoading(true);
    const [year, month] = monthStr.split('-');
    try {
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const startStr = format(startOfMonth(d), 'yyyy-MM-dd');
      const endStr = format(endOfMonth(d), 'yyyy-MM-dd');

      const [recordsRes, requestsRes] = await Promise.all([
        getMonthlyWorkRecords(startStr, endStr),
        getMonthlyWorkApplyWorks(parseInt(year, 10), parseInt(month, 10))
      ]);
      
      let workRecs = [];
      if (recordsRes.success) {
        workRecs = recordsRes.data.content || recordsRes.data || [];
      }

      let reqList = [];
      if (requestsRes.success) {
        reqList = requestsRes.data.content || (Array.isArray(requestsRes.data) ? requestsRes.data : []);
      }

      const today = startOfDay(new Date());
      const missingList = [];

      reqList.forEach(req => {
        if ((req.wsdStatus === '출근' || req.wsdStatus === '배정' || req.wsdStatus === '타지점근무') && req.wsdIsConfirmed === true) {
          const reqDate = parseDateStr(req.date || req.wsdDate);
          if (isBefore(reqDate, today) || isSameDay(reqDate, today)) {
            const hasRecord = workRecs.some(wr => {
              const wrD = parseDateStr(wr.wrDate);
              return isSameDay(wrD, reqDate);
            });
            if (!hasRecord) {
              missingList.push({
                isMissing: true,
                wrDate: req.date || req.wsdDate,
                workPlaceName: req.wsdWorkPlaceName,
                assignedStartTime: req.wsdStartTime,
                wrIdx: `missing_${req.wsdIdx || Math.random()}`,
                rawRequest: req
              });
            }
          }
        }
      });

      const merged = [...workRecs, ...missingList].sort((a, b) => {
        const dA = parseDateStr(a.wrDate);
        const dB = parseDateStr(b.wrDate);
        return dB - dA;
      });

      setRecords(merged);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteRecord = async (wrIdx) => {
    if (!window.confirm('근무 기록을 삭제하시겠습니까?')) return;
    try {
      await globalApiClient.delete(`/api/work-record/${wrIdx}`);
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('workRecordsCache_') || key.startsWith('workRecordsMonthlyCache_')) {
          sessionStorage.removeItem(key);
        }
      });
      loadRecords(selectedMonth);
    } catch (err) {
      alert(err.response?.data?.msg || err.message || '근무 기록 삭제에 실패했습니다.');
    }
  };

  const handleEditRecord = (record) => {
    setModalMode('edit');
    setEditTargetRecord(record);
    setModalInitialData(null);
    setShowModal(true);
  };

  const handleOpenMissingRecord = (record) => {
    const d = parseDateStr(record.wrDate);
    const recDate = format(d, 'yyyy-MM-dd');

    let targetWpIdx = String(user?.workPlaceIdx || '');
    if (record.workPlaceName) {
      const matched = branches.find(b => b.wpName === record.workPlaceName);
      if (matched) targetWpIdx = String(matched.wpIdx);
    }

    let sHour = 18;
    let sMin = 0;
    if (record.assignedStartTime === '오픈') {
      const isWknd = isWeekend(d);
      const isHol = isHoliday(d);
      sHour = (isWknd || isHol) ? 10 : 16;
    } else if (record.assignedStartTime) {
      const parts = record.assignedStartTime.split(':');
      sHour = parseInt(parts[0], 10) || 18;
      sMin = parseInt(parts[1], 10) || 0;
    }

    const eHour = (sHour + 4) % 24;

    setModalMode('create');
    setEditTargetRecord(null);
    setModalInitialData({
      recDate,
      workPlaceIdx: targetWpIdx,
      startHour: String(sHour).padStart(2, '0'),
      startMin: sMin >= 15 && sMin < 45 ? '30' : '00',
      endHour: String(eHour).padStart(2, '0'),
      endMin: sMin >= 15 && sMin < 45 ? '30' : '00'
    });
    setShowModal(true);
  };

  const handleOpenNewModal = () => {
    setModalMode('create');
    setEditTargetRecord(null);
    setModalInitialData(null);
    setShowModal(true);
  };

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    setSelectedMonth(format(subMonths(d, 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    setSelectedMonth(format(addMonths(d, 1), 'yyyy-MM'));
  };

  useEffect(() => {
    loadRecords(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    fetchWorkPlaces().then(res => {
      if (res.success && res.data) setBranches(res.data);
    });
  }, []);

  useEffect(() => {
    setCurrentPage(0);
    setPageInput("1");
    setExpandedRecordId(null);
  }, [selectedMonth]);

  const filteredRecords = useMemo(() => records, [records]);
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const pagedRecords = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  return (
    <Container className="py-3 py-md-4 mb-5" style={{ maxWidth: '640px' }}>
      {/* 1. 상단 월 선택 네비게이터 & 새 기록 추가 버튼 */}
      <RecordMonthNavigator
        selectedMonth={selectedMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onSelectMonth={setSelectedMonth}
        onOpenNewModal={handleOpenNewModal}
      />

      {dataLoading ? (
        <Loading />
      ) : (
        <>
          {/* 2. 2분할 통합 통계 요약 카드 */}
          <RecordStatSummary
            totalDays={filteredRecords.length}
            totalHours={filteredRecords
              .reduce((acc, r) => acc + calculateTotalHours(r.wrStartTime, r.wrEndTime, r.wrRestTime), 0)
              .toFixed(1)}
          />

          {/* 3. 한 줄 압축 행 기록 목록 */}
          <div className="rec-list-container">
            {filteredRecords.length === 0 ? (
              <div
                className="text-center text-muted py-5 rounded-4 border"
                style={{
                  borderColor: 'var(--color-input-border)',
                  backgroundColor: 'var(--color-surface)'
                }}
              >
                <RiCalendarCheckLine
                  size={44}
                  className="mb-2"
                  style={{ opacity: 0.4, color: 'var(--color-primary)' }}
                />
                <p className="mb-0 fw-medium">해당 월의 근무 기록이 없습니다.</p>
              </div>
            ) : (
              <>
                {pagedRecords.map((record) => (
                  <RecordListItem
                    key={record.wrIdx}
                    record={record}
                    isExpanded={expandedRecordId === record.wrIdx}
                    onToggle={() =>
                      setExpandedRecordId(
                        expandedRecordId === record.wrIdx ? null : record.wrIdx
                      )
                    }
                    onDelete={handleDeleteRecord}
                    onEdit={handleEditRecord}
                    onOpenMissing={handleOpenMissingRecord}
                  />
                ))}

                {totalPages > 0 && (
                  <div className="mt-4">
                    <PaginationBar
                      page={currentPage}
                      totalPages={totalPages}
                      setPage={setCurrentPage}
                      pageInput={pageInput}
                      setPageInput={setPageInput}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* 4. 근무 기록 등록 / 수정 (바텀시트 / 모달) */}
      <RecordModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setEditTargetRecord(null);
          setModalInitialData(null);
        }}
        isMobile={isMobile}
        user={user}
        branches={branches}
        mode={modalMode}
        targetRecord={editTargetRecord}
        initialData={modalInitialData}
        onSuccess={() => loadRecords(selectedMonth)}
      />
    </Container>
  );
};

export default Records;
