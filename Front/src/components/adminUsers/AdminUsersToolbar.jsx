import React from 'react';
import { Button, ButtonGroup, ToggleButton, Form, Alert } from 'react-bootstrap';
import { RiSearchLine, RiDownload2Line } from 'react-icons/ri';
import BranchFilter from '../BranchFilter';

const AdminUsersToolbar = ({
  handleOpenAddModal,
  activeStatus,
  setActiveStatus,
  selectedRole,
  setSelectedRole,
  selectedBranch,
  setSelectedBranch,
  searchName,
  setSearchName,
  handleSearch,
  setPage,
  setPageInput,
  canViewSensitive,
  showBankCols,
  handleShowBankColsChange,
  showAccountPlain,
  handleShowAccountPlainChange,
  canExportExcel,
  handleDownloadUsersExcel,
  excelDownloading,
  selectedUserIdxs,
  handleOpenBulkModal,
  copyToast
}) => {
  return (
    <div className="admin-header-card">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 gap-md-3">
        <div className="d-flex justify-content-between align-items-center w-100 w-md-auto">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>직원 관리</h2>
            <p className="text-muted small mb-0">알바생 및 직원의 시급, 계좌 등 민감정보와 근무 상태를 관리합니다.</p>
          </div>
          <Button variant="primary" className="fw-bold px-3 py-1.5 rounded-pill shadow-sm d-md-none text-nowrap ms-2" onClick={handleOpenAddModal}>
            + 직원 추가
          </Button>
        </div>

        <div className="d-flex flex-column align-items-md-end gap-2 w-100 w-md-auto">
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <ButtonGroup className="shadow-xs">
              <ToggleButton id="tab-active-all" type="radio" variant={activeStatus === 'ALL' ? "success" : "outline-success"} name="activeRadio" value="ALL" checked={activeStatus === 'ALL'} onChange={() => { setActiveStatus('ALL'); setPage(0); setPageInput('1'); }} className="px-2 px-sm-3 py-1 fw-bold">전체</ToggleButton>
              <ToggleButton id="tab-active" type="radio" variant={activeStatus === 'ACTIVE' ? "success" : "outline-success"} name="activeRadio" value="ACTIVE" checked={activeStatus === 'ACTIVE'} onChange={() => { setActiveStatus('ACTIVE'); setPage(0); setPageInput('1'); }} className="px-2 px-sm-3 py-1 fw-bold">재직</ToggleButton>
              <ToggleButton id="tab-leave" type="radio" variant={activeStatus === 'LEAVE' ? "warning" : "outline-warning"} name="activeRadio" value="LEAVE" checked={activeStatus === 'LEAVE'} onChange={() => { setActiveStatus('LEAVE'); setPage(0); setPageInput('1'); }} className="px-2 px-sm-3 py-1 fw-bold">휴직</ToggleButton>
              <ToggleButton id="tab-resigned" type="radio" variant={activeStatus === 'INACTIVE' ? "danger" : "outline-danger"} name="activeRadio" value="INACTIVE" checked={activeStatus === 'INACTIVE'} onChange={() => { setActiveStatus('INACTIVE'); setPage(0); setPageInput('1'); }} className="px-2 px-sm-3 py-1 fw-bold">퇴사</ToggleButton>
            </ButtonGroup>

            <ButtonGroup className="shadow-xs">
              <ToggleButton id="role-all" type="radio" variant={selectedRole === '전체' ? "primary" : "outline-primary"} name="roleRadio" value="전체" checked={selectedRole === '전체'} onChange={e => { setSelectedRole(e.currentTarget.value); setSelectedBranch(''); setPage(0); setPageInput('1'); }} className="px-2 px-sm-3 py-1 fw-bold">전체</ToggleButton>
              <ToggleButton id="role-worker" type="radio" variant={selectedRole === '알바생' ? "primary" : "outline-primary"} name="roleRadio" value="알바생" checked={selectedRole === '알바생'} onChange={e => { setSelectedRole(e.currentTarget.value); setPage(0); setPageInput('1'); }} className="px-2 px-sm-3 py-1 fw-bold">알바생</ToggleButton>
              <ToggleButton id="role-admin" type="radio" variant={selectedRole === '직원' ? "primary" : "outline-primary"} name="roleRadio" value="직원" checked={selectedRole === '직원'} onChange={e => { setSelectedRole(e.currentTarget.value); setSelectedBranch(''); setPage(0); setPageInput('1'); }} className="px-2 px-sm-3 py-1 fw-bold">직원</ToggleButton>
            </ButtonGroup>

            <Button variant="primary" className="fw-bold px-3 py-1.5 rounded-pill shadow-sm d-none d-md-inline-block text-nowrap ms-2" onClick={handleOpenAddModal}>
              + 직원 추가
            </Button>
          </div>
        </div>
      </div>

      <hr className="my-3 opacity-25" />

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 flex-wrap w-100">
          <BranchFilter selectedBranch={selectedBranch} onlyAll={selectedRole === '직원'} onChange={(val) => { setSelectedBranch(val); setPage(0); setPageInput('1'); }} />

          <Form onSubmit={handleSearch} className="admin-search-form d-flex align-items-center gap-1 ms-md-auto">
            <Form.Control type="text" placeholder="이름 검색" value={searchName} onChange={e => setSearchName(e.target.value)} className="custom-input py-2" disabled={selectedRole === '직원'} />
            <Button type="submit" variant="primary" className="fw-bold d-flex align-items-center gap-1 rounded-3 px-3 py-2 text-nowrap" disabled={selectedRole === '직원'}>
              <RiSearchLine size={16} /> 검색
            </Button>
          </Form>
        </div>

        <div className="d-flex gap-2 align-items-center ms-md-auto flex-wrap w-100 w-md-auto justify-content-between justify-content-md-end mt-2 mt-md-0">
          {canViewSensitive && (
            <div className="bank-sensitive-controls d-flex flex-column flex-md-row gap-2 py-1 px-2">
              {showBankCols && (
                <div className="bank-sensitive-row">
                  <span className="bank-sensitive-label">계좌번호</span>
                  <div className="bank-sensitive-seg" role="radiogroup" aria-label="계좌번호 원문">
                    <input
                      type="radio"
                      id="account-plain-show"
                      name="accountPlainRadio"
                      checked={showAccountPlain}
                      onChange={() => handleShowAccountPlainChange(true)}
                    />
                    <label htmlFor="account-plain-show">원문 조회</label>
                    <input
                      type="radio"
                      id="account-plain-hide"
                      name="accountPlainRadio"
                      checked={!showAccountPlain}
                      onChange={() => handleShowAccountPlainChange(false)}
                    />
                    <label htmlFor="account-plain-hide">숨김</label>
                  </div>
                </div>
              )}
              <div className="bank-sensitive-row">
                <span className="bank-sensitive-label">은행정보</span>
                <div className="bank-sensitive-seg" role="radiogroup" aria-label="은행정보 표시">
                  <input
                    type="radio"
                    id="bank-cols-show"
                    name="bankColsRadio"
                    checked={showBankCols}
                    onChange={() => handleShowBankColsChange(true)}
                  />
                  <label htmlFor="bank-cols-show">보기</label>
                  <input
                    type="radio"
                    id="bank-cols-hide"
                    name="bankColsRadio"
                    checked={!showBankCols}
                    onChange={() => handleShowBankColsChange(false)}
                  />
                  <label htmlFor="bank-cols-hide">숨김</label>
                </div>
              </div>
            </div>
          )}
          <div className="d-flex gap-2 align-items-center flex-wrap">
            {canExportExcel && (
              <Button variant="success" className="fw-bold px-3 py-1.5 rounded-3 shadow-sm text-nowrap" onClick={handleDownloadUsersExcel} disabled={excelDownloading}>
                <RiDownload2Line className="me-1" />
                {excelDownloading ? '다운로드 중...' : '엑셀 다운로드'}
              </Button>
            )}
            <Button variant="secondary" disabled={selectedUserIdxs.size === 0} onClick={handleOpenBulkModal} className="fw-bold px-3 py-1.5 rounded-3 shadow-sm text-nowrap">
              선택된 직원 일괄 수정 ({selectedUserIdxs.size})
            </Button>
          </div>
        </div>
      </div>
      {copyToast && <Alert variant="success" className="py-2 mt-2 mb-0">{copyToast}</Alert>}
      {activeStatus === 'INACTIVE' && (
        <Alert variant="warning" className="py-2 mt-3 mb-0 small text-dark" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold">※ 개인정보 보호를 위해 퇴사 후 1년이 경과한 직원의 신상 정보는 마스킹 처리되며, 원본은 권한이 있는 자만 조회할 수 있습니다.</span>
        </Alert>
      )}
    </div>
  );
};

export default AdminUsersToolbar;

