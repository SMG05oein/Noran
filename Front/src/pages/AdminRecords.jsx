import { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { fetchWorkRecords, updateWorkRecord, downloadWorkRecordExcel, fetchWorkRecordHistory, deleteWorkRecord, restoreWorkRecord, fetchUnrecordedWorkList } from '../api/workApi';
import { fetchWorkPlaces } from '../api/authApi';
import { format } from 'date-fns';
import Loading from '../components/Loading';
import AdminCreateRecordModal from '../components/AdminCreateRecordModal';
import AdminExcelUploadModal from '../components/AdminExcelUploadModal';
import AdminUnrecordedModal from '../components/AdminUnrecordedModal';
import useSyncExcelDownloadProgress from '../hooks/useSyncExcelDownloadProgress';
import AdminRecordsToolbar from '../components/adminRecords/AdminRecordsToolbar';
import AdminRecordsTable from '../components/adminRecords/AdminRecordsTable';
import AdminRecordsModals from '../components/adminRecords/AdminRecordsModals';
import './AdminMain.css';

const AdminRecords = () => {
  const [selectedWpIdx, setSelectedWpIdx] = useState(null); // null이면 전체
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [workRecords, setWorkRecords] = useState([]);
  const [branches, setBranches] = useState([{ wpIdx: null, wpName: '전체' }]);
  const [loading, setLoading] = useState(true);

  // Pagination & Sorting states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // 수정 모달 상태
  const [editRecord, setEditRecord] = useState(null);
  const [startHour, setStartHour] = useState('');
  const [startMin, setStartMin] = useState('');
  const [endHour, setEndHour] = useState('');
  const [endMin, setEndMin] = useState('');
  const [restHour, setRestHour] = useState('');
  const [restMin, setRestMin] = useState('');
  const [remarks, setRemarks] = useState('');
  const [editWorkPlaceIdx, setEditWorkPlaceIdx] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    busy: downloading,
    runDownload,
    ProgressModal: DownloadProgressModal,
  } = useSyncExcelDownloadProgress({
    title: '엑셀 다운로드 중...',
  });

  // 수정 이력(Audit Log) 관련 상태
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySearchInput, setHistorySearchInput] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [unrecordedList, setUnrecordedList] = useState([]);
  const [unrecordedLoading, setUnrecordedLoading] = useState(false);
  const [showUnrecordedModal, setShowUnrecordedModal] = useState(false);

  const loadBranches = async () => {
    const branchRes = await fetchWorkPlaces();
    if (branchRes.success && branchRes.data) {
      setBranches([{ wpIdx: null, wpName: '전체' }, ...branchRes.data]);
    }
  };

  const loadData = async (skipCache = false) => {
    setLoading(true);
    let year, month;
    if (selectedMonth) {
      const [yStr, mStr] = selectedMonth.split('-');
      year = parseInt(yStr, 10);
      month = parseInt(mStr, 10);
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    const params = {
      page,
      size: 10,
      sortBy: sortBy || undefined,
      sortDir: sortBy ? sortDir : undefined,
      userName: searchTerm || undefined,
      workPlaceIdx: selectedWpIdx || undefined,
      year: year || undefined,
      month: month || undefined
    };

    const recRes = await fetchWorkRecords(params, skipCache);
    if (recRes.success) {
      setWorkRecords(recRes.data.content || recRes.data || []);
      setTotalPages(recRes.data.page?.totalPages || 1);
    }
    setLoading(false);
  };

  const loadUnrecorded = async () => {
    if (!selectedMonth) return;
    setUnrecordedLoading(true);
    const [yStr, mStr] = selectedMonth.split('-');
    const res = await fetchUnrecordedWorkList({
      year: parseInt(yStr, 10),
      month: parseInt(mStr, 10),
      workPlaceIdx: selectedWpIdx || undefined,
    });
    if (res.success && Array.isArray(res.data)) {
      setUnrecordedList(res.data);
    } else {
      setUnrecordedList([]);
    }
    setUnrecordedLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadBranches();
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
      setPageInput((page + 1).toString());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, sortDir, searchTerm, selectedWpIdx, selectedMonth]);

  useEffect(() => {
    queueMicrotask(() => {
      loadUnrecorded();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWpIdx, selectedMonth]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(0);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortBy('');
        setSortDir('asc');
      }
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
    setPageInput('1');
  };

  const openEditModal = (r) => {
    setEditRecord(r);
    const parseTime = (t) => {
      if (Array.isArray(t)) return [String(t[0]).padStart(2, '0'), String(t[1]).padStart(2, '0')];
      if (typeof t === 'string') return t.split(':').slice(0, 2);
      return ['00', '00'];
    };
    const [sh, sm] = parseTime(r.wrStartTime);
    const [eh, em] = parseTime(r.wrEndTime);
    const [rh, rm] = parseTime(r.wrRestTime);
    setStartHour(sh); setStartMin(sm);
    setEndHour(eh); setEndMin(em);
    setRestHour(rh); setRestMin(rm);
    setRemarks(r.wrRemarks || '');
    setEditWorkPlaceIdx(r.workPlaceIdx != null ? String(r.workPlaceIdx) : '');
  };

  const handleSaveEdit = async () => {
    if (!editRecord) return;
    if (!editWorkPlaceIdx) {
      alert('근무지를 선택해주세요.');
      return;
    }
    setSaving(true);
    const payload = {
      ...editRecord,
      wrStartTime: `${startHour}:${startMin}`,
      wrEndTime: `${endHour}:${endMin}`,
      wrRestTime: `${restHour}:${restMin}`,
      wrRemarks: remarks,
      workPlaceIdx: parseInt(editWorkPlaceIdx, 10)
    };
    if (Array.isArray(payload.wrDate)) {
      payload.wrDate = `${payload.wrDate[0]}-${String(payload.wrDate[1]).padStart(2, '0')}-${String(payload.wrDate[2]).padStart(2, '0')}`;
    }
    const res = await updateWorkRecord(editRecord.wrIdx, payload);
    setSaving(false);
    if (res.success) {
      alert('근무 기록이 수정되었습니다.');
      setEditRecord(null);
      loadData();
    } else {
      alert(res.error || '수정에 실패했습니다.');
    }
  };

  const handleDeleteRecord = async (wrIdx) => {
    if (!window.confirm('정말 이 근무 기록을 삭제하시겠습니까?')) return;
    const res = await deleteWorkRecord(wrIdx);
    if (res.success) {
      alert('근무 기록이 삭제되었습니다.');
      loadData();
    } else {
      alert(res.error || '삭제에 실패했습니다.');
    }
  };

  const openHistoryModal = async () => {
    setShowHistoryModal(true);
    setHistorySearchInput('');
    setHistorySearchTerm('');
    await loadHistoryData('');
  };

  const handleRestoreRecord = async (wrhIdx) => {
    if (!window.confirm('이 삭제된 기록을 복구하시겠습니까?')) return;
    setHistoryLoading(true);
    const res = await restoreWorkRecord(wrhIdx);
    if (res.success) {
      alert('근무 기록이 복구되었습니다.');
      loadData();
      await loadHistoryData(historySearchTerm);
    } else {
      alert(res.error || '복구에 실패했습니다.');
    }
    setHistoryLoading(false);
  };

  const loadHistoryData = async (searchKw = '') => {
    setHistoryLoading(true);
    const params = {};
    if (searchKw) {
      params.keyword = searchKw;
    }

    if (selectedMonth) {
      const [yStr, mStr] = selectedMonth.split('-');
      params.year = parseInt(yStr, 10);
      params.month = parseInt(mStr, 10);
    } else {
      const now = new Date();
      params.year = now.getFullYear();
      params.month = now.getMonth() + 1;
    }

    params.size = 100;

    const res = await fetchWorkRecordHistory(params);
    if (res.success) {
      let data = Array.isArray(res.data) ? res.data : (res.data.content || []);
      data = [...data].sort((a, b) => (b.wrhIdx || 0) - (a.wrhIdx || 0));
      setHistoryData(data);
    } else {
      alert(res.error || '수정 이력을 불러오지 못했습니다.');
    }
    setHistoryLoading(false);
  };

  const handleHistorySearch = (e) => {
    e.preventDefault();
    setHistorySearchTerm(historySearchInput);
    loadHistoryData(historySearchInput);
  };

  const filteredHistory = historyData.filter(log => {
    if (!historySearchTerm) return true;
    const term = historySearchTerm.toLowerCase();
    const workerName = (log.targetUserName || '').toLowerCase();
    const modifierName = (log.adminName || '').toLowerCase();
    return workerName.includes(term) || modifierName.includes(term);
  });

  const handleDownloadExcel = async () => {
    if (!selectedMonth || downloading) return;
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const workPlaceIdx = selectedWpIdx || null;

    await runDownload(({ signal }) =>
      downloadWorkRecordExcel(year, month, workPlaceIdx, { signal })
    );
  };

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        <AdminRecordsToolbar
          unrecordedList={unrecordedList}
          unrecordedLoading={unrecordedLoading}
          downloading={downloading}
          branches={branches}
          selectedWpIdx={selectedWpIdx}
          setSelectedWpIdx={setSelectedWpIdx}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          onSearch={handleSearch}
          onOpenCreateModal={() => setShowCreateModal(true)}
          onOpenUnrecordedModal={() => setShowUnrecordedModal(true)}
          onOpenHistoryModal={openHistoryModal}
          onDownloadExcel={handleDownloadExcel}
          onOpenExcelModal={() => setShowExcelModal(true)}
          setPage={setPage}
          setPageInput={setPageInput}
        />

        {loading ? <Loading /> : (
          <AdminRecordsTable
            filteredRecords={workRecords}
            page={page}
            totalPages={totalPages}
            pageInput={pageInput}
            setPage={setPage}
            setPageInput={setPageInput}
            sortBy={sortBy}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            onOpenEditModal={openEditModal}
            onDeleteRecord={handleDeleteRecord}
          />
        )}
      </Container>

      <AdminRecordsModals
        editRecord={editRecord}
        setEditRecord={setEditRecord}
        editWorkPlaceIdx={editWorkPlaceIdx}
        setEditWorkPlaceIdx={setEditWorkPlaceIdx}
        branches={branches}
        startHour={startHour}
        setStartHour={setStartHour}
        startMin={startMin}
        setStartMin={setStartMin}
        endHour={endHour}
        setEndHour={setEndHour}
        endMin={endMin}
        setEndMin={setEndMin}
        restHour={restHour}
        setRestHour={setRestHour}
        restMin={restMin}
        setRestMin={setRestMin}
        remarks={remarks}
        setRemarks={setRemarks}
        saving={saving}
        onSaveEdit={handleSaveEdit}
        showHistoryModal={showHistoryModal}
        setShowHistoryModal={setShowHistoryModal}
        historySearchInput={historySearchInput}
        setHistorySearchInput={setHistorySearchInput}
        onHistorySearch={handleHistorySearch}
        historyLoading={historyLoading}
        filteredHistory={filteredHistory}
        onRestoreRecord={handleRestoreRecord}
      />

      <AdminCreateRecordModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          loadData();
        }}
        branches={branches}
        selectedMonth={selectedMonth}
      />

      <AdminExcelUploadModal
        show={showExcelModal}
        onHide={() => setShowExcelModal(false)}
        branches={branches}
        onSuccess={() => {
          loadData(true);
        }}
      />

      <AdminUnrecordedModal
        show={showUnrecordedModal}
        onHide={() => setShowUnrecordedModal(false)}
        unrecordedList={unrecordedList}
        loading={unrecordedLoading}
        onRefresh={loadUnrecorded}
        selectedMonth={selectedMonth}
        selectedBranchName={branches.find(b => b.wpIdx === selectedWpIdx)?.wpName || '전체'}
      />

      {DownloadProgressModal}
    </div>
  );
};

export default AdminRecords;
