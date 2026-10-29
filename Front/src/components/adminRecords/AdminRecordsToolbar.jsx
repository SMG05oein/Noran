import React from 'react';
import { Button, Dropdown, Form, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  RiSearchLine,
  RiDownload2Line,
  RiHistoryLine,
  RiFileExcel2Line,
  RiAddLine,
  RiUpload2Line,
  RiAlertLine
} from 'react-icons/ri';

const AdminRecordsToolbar = ({
  unrecordedList,
  unrecordedLoading,
  downloading,
  branches,
  selectedWpIdx,
  setSelectedWpIdx,
  selectedMonth,
  setSelectedMonth,
  searchInput,
  setSearchInput,
  onSearch,
  onOpenCreateModal,
  onOpenUnrecordedModal,
  onOpenHistoryModal,
  onDownloadExcel,
  onOpenExcelModal,
  setPage,
  setPageInput
}) => {
  const navigate = useNavigate();

  return (
    <div className="admin-header-card">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-1">근무 기록</h2>
          <p className="text-muted small mb-0">전체 직원의 월별 출퇴근 기록을 조회, 검색, 수정하고 엑셀로 다운로드합니다.</p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            className="fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-xs text-nowrap"
            onClick={onOpenCreateModal}
          >
            <RiAddLine size={18} /> 새 기록 추가
          </Button>

          <Button
            variant={unrecordedList.length > 0 ? 'danger' : 'outline-secondary'}
            className="fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-xs text-nowrap"
            onClick={onOpenUnrecordedModal}
            title="배정되었으나 출퇴근 기록을 남기지 않은 알바생 조회"
          >
            <RiAlertLine size={16} />
            <span>미작성 알바생</span>
            <span
              className={`ms-1 px-2 py-0 rounded-pill fw-bold ${unrecordedList.length > 0
                  ? 'unrecorded-badge-count shadow-xs'
                  : 'bg-secondary text-white'
                }`}
              style={{
                fontSize: '0.8rem',
                lineHeight: '1.4',
                ...(unrecordedList.length > 0
                  ? {
                    backgroundColor: '#000000',
                    color: '#ffffff',
                  }
                  : {})
              }}
            >
              {unrecordedLoading ? (
                <Spinner animation="border" size="sm" style={{ width: '0.7rem', height: '0.7rem' }} />
              ) : (
                unrecordedList.length
              )}
            </span>
          </Button>

          <Button
            variant="outline-info"
            className="fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-xs text-nowrap"
            onClick={onOpenHistoryModal}
          >
            <RiHistoryLine size={16} /> 수정 이력
          </Button>

          <Dropdown align="end">
            <Dropdown.Toggle
              variant="success"
              className="fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-xs text-nowrap"
              id="excel-dropdown"
              disabled={downloading}
            >
              {downloading ? <Spinner as="span" animation="border" size="sm" /> : <RiFileExcel2Line size={17} />}
              <span>{downloading ? '엑셀 다운로드 중...' : '엑셀 관리'}</span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="shadow border-0 py-2 rounded-3 mt-1">
              <Dropdown.Item
                onClick={onDownloadExcel}
                disabled={downloading}
                className="d-flex align-items-center gap-2 py-2"
              >
                <RiDownload2Line size={16} className="text-success" />
                <span>{downloading ? '다운로드 중...' : '엑셀 다운로드'}</span>
              </Dropdown.Item>
              <Dropdown.Item
                onClick={onOpenExcelModal}
                className="d-flex align-items-center gap-2 py-2"
              >
                <RiUpload2Line size={16} className="text-primary" />
                <span>엑셀 일괄 등록</span>
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                onClick={() => navigate('/admin/records/excel-compare')}
                className="d-flex align-items-center gap-2 py-2"
              >
                <RiFileExcel2Line size={16} className="text-secondary" />
                <span>엑셀 대조</span>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      <hr className="my-3 opacity-25" />

      {/* 검색 및 필터 바 */}
      <div className="d-flex gap-2 align-items-center flex-wrap w-100">
        <div className="branch-select-pills mb-0">
          {branches.map((b) => (
            <button
              key={b.wpIdx ?? 'all'}
              type="button"
              className={`branch-pill ${selectedWpIdx === b.wpIdx ? 'active' : ''}`}
              onClick={() => {
                setSelectedWpIdx(b.wpIdx);
                setPage(0);
                setPageInput('1');
              }}
            >
              {b.wpName}
            </button>
          ))}
        </div>

        <Form.Control
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="custom-input py-2 fw-bold text-primary admin-filter-month"
        />

        <Form onSubmit={onSearch} className="admin-search-form d-flex align-items-center gap-1 ms-md-auto">
          <Form.Control
            type="text"
            placeholder="직원 이름 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="custom-input py-2"
          />
          <Button type="submit" variant="primary" className="fw-bold d-flex align-items-center gap-1 rounded-3 px-3 py-2 text-nowrap">
            <RiSearchLine size={16} /> 검색
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default AdminRecordsToolbar;

