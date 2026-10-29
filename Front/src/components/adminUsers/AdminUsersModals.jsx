import React from 'react';
import { Modal, Button, Form, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { formatPhoneNumber } from './adminUsersUtils';

export const BulkEditModal = ({
  show,
  onHide,
  bulkSaving,
  selectedUserCount,
  bulkError,
  bulkSuccess,
  bulkStatus,
  setBulkStatus,
  bulkFkUtIdx,
  setBulkFkUtIdx,
  bulkWage,
  setBulkWage,
  userTypes,
  onSave
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton={!bulkSaving}>
        <Modal.Title className="fw-bold">선택된 직원 일괄 수정 ({selectedUserCount}명)</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {bulkSaving ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} className="mb-3" />
            <h6 className="fw-bold text-dark mb-1">직원 정보를 일괄 수정(반영)하는 중입니다...</h6>
            <p className="text-muted small mb-0">서버에 변경 사항을 반영하고 목록을 갱신 중입니다. 잠시만 기다려 주세요.</p>
          </div>
        ) : (
          <>
            {bulkError && <Alert variant="danger" className="py-2">{bulkError}</Alert>}
            {bulkSuccess && <Alert variant="success" className="py-2">{bulkSuccess}</Alert>}

            <div className="text-muted small mb-3">
              변경을 원하지 않는 항목은 비워두시면 기존 값이 유지됩니다.
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">재직 상태 변경</Form.Label>
              <Form.Select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                <option value="">-- 변경 안 함 --</option>
                <option value="1">재직 (복직)</option>
                <option value="2">휴직 처리</option>
                <option value="0">퇴사 (비활성화)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">직급 일괄 변경</Form.Label>
              <Form.Select value={bulkFkUtIdx} onChange={e => setBulkFkUtIdx(e.target.value)}>
                <option value="">-- 변경 안 함 --</option>
                {userTypes.map(ut => (
                  <option key={ut.utIdx} value={ut.utIdx}>{ut.utName}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">시급 일괄 변경 (숫자만)</Form.Label>
              <Form.Control type="number" placeholder="예: 10030" value={bulkWage} onChange={e => setBulkWage(e.target.value)} />
            </Form.Group>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={bulkSaving}>취소</Button>
        <Button variant="primary" onClick={onSave} disabled={bulkSaving} className="fw-bold px-4">
          {bulkSaving ? <Spinner as="span" animation="border" size="sm" /> : '일괄 수정 적용'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const EditUserModal = ({
  editUser,
  onHide,
  editError,
  editSuccess,
  editUserName,
  setEditUserName,
  editEmail,
  setEditEmail,
  editPhone,
  setEditPhone,
  editBranch,
  setEditBranch,
  branches,
  editFkUtIdx,
  setEditFkUtIdx,
  userTypes,
  me,
  canViewSensitive,
  canEditSensitive,
  banks,
  editBank,
  setEditBank,
  editAccountName,
  setEditAccountName,
  editAccountNo,
  setEditAccountNo,
  sensitiveDataLoaded,
  sensitiveLoading,
  handleRevealSensitive,
  editWage,
  setEditWage,
  handleToggleActive,
  onOpenTempPw,
  handleEditSave,
  editSaving
}) => {
  return (
    <Modal show={!!editUser} onHide={onHide} centered size="lg">
      <Modal.Header closeButton><Modal.Title className="fw-bold">✏️ {editUser?.userName} 정보 수정</Modal.Title></Modal.Header>
      <Modal.Body>
        {editError && <Alert variant="danger" className="py-2">{editError}</Alert>}
        {editSuccess && <Alert variant="success" className="py-2">{editSuccess}</Alert>}
        {editUser?.userIsActive === 0 && (
          <Alert variant="danger" className="py-2 small fw-bold">퇴사자의 정보는 보호를 위해 수정할 수 없습니다. (열람만 가능)</Alert>
        )}

        <div className="row">
          <div className="col-md-6">
            <div className="fw-bold text-primary mb-2 border-bottom pb-2">기본 정보</div>
            <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">이름</Form.Label><Form.Control value={editUserName} onChange={e => setEditUserName(e.target.value)} disabled={editUser?.userIsActive === 0} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">이메일</Form.Label><Form.Control type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} disabled={editUser?.userIsActive === 0} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">전화번호</Form.Label><Form.Control value={editPhone} onChange={e => setEditPhone(formatPhoneNumber(e.target.value))} disabled={editUser?.userIsActive === 0} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">소속 지점</Form.Label>
              <Form.Select value={editBranch} onChange={e => setEditBranch(Number(e.target.value))} disabled={editUser?.userIsActive === 0}>
                {branches.filter(b => b.wpIdx !== '').map(b => <option key={b.wpIdx} value={b.wpIdx}>{b.wpName}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">직급</Form.Label>
              <Form.Select
                value={editFkUtIdx}
                onChange={e => setEditFkUtIdx(e.target.value)}
                disabled={Number(editUser?.userIdx) === Number(me?.userIdx) || editUser?.userIsActive === 0}
              >
                <option value="">직급 선택</option>
                {userTypes.map(ut => <option key={ut.utIdx} value={String(ut.utIdx)}>{ut.utName}</option>)}
              </Form.Select>
              {(() => {
                const currentName = editUser?.userTypeName
                  || editUser?.userType
                  || userTypes.find(t => String(t.utIdx) === String(editFkUtIdx))?.utName;
                return currentName ? (
                  <div className="text-muted small mt-1">현재 직급: <span className="fw-bold text-dark">{currentName}</span></div>
                ) : null;
              })()}
              {Number(editUser?.userIdx) === Number(me?.userIdx) && (
                <div className="text-muted small mt-1">본인 계정의 직급은 변경할 수 없습니다.</div>
              )}
            </Form.Group>
          </div>

          <div className="col-md-6">
            <div className="fw-bold text-danger mb-2 border-bottom pb-2">
              급여 및 계좌 정보
            </div>
            {!canViewSensitive ? (
              <Alert variant="secondary" className="py-2 small">민감정보 조회 권한이 없습니다.</Alert>
            ) : (
              <>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-muted small">은행명</Form.Label>
                  <Form.Select value={editBank} onChange={e => setEditBank(e.target.value)} disabled={!canEditSensitive || editUser?.userIsActive === 0}>
                    <option value="">은행 선택</option>
                    {banks.map(bank => (
                      <option key={bank.bankCode || bank.code || bank.bankName} value={bank.bankCode || bank.code}>
                        {bank.bankName || bank.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-muted small">예금주명</Form.Label>
                  <Form.Control value={editAccountName} onChange={e => setEditAccountName(e.target.value)} placeholder="예금주 입력" disabled={!canEditSensitive || editUser?.userIsActive === 0} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-muted small">계좌번호</Form.Label>
                  <InputGroup>
                    <Form.Control value={editAccountNo} onChange={e => setEditAccountNo(e.target.value.replace(/[^0-9]/g, ''))} placeholder="계좌번호 입력" disabled={!canEditSensitive || (editAccountNo?.startsWith('기재') && !sensitiveDataLoaded) || editUser?.userIsActive === 0} />
                    {canViewSensitive && !sensitiveDataLoaded && editAccountNo?.startsWith('기재') && (
                      <Button variant="outline-danger" onClick={handleRevealSensitive} disabled={sensitiveLoading} className="fw-bold px-3">
                        {sensitiveLoading ? <Spinner size="sm" /> : '원문 조회'}
                      </Button>
                    )}
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-muted small">시급</Form.Label>
                  <Form.Control type="number" value={editWage} onChange={e => setEditWage(e.target.value)} placeholder="숫자만 입력" disabled={!canEditSensitive || editUser?.userIsActive === 0} />
                </Form.Group>
              </>
            )}
            {!canEditSensitive && canViewSensitive && (
              <Alert variant="warning" className="py-2 small">민감정보 수정 권한이 없어 급여/계좌는 저장되지 않습니다.</Alert>
            )}
          </div>
        </div>

        <hr className="my-3 opacity-25" />
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <Button size="sm" variant={editUser?.userIsActive === 1 ? 'outline-danger' : 'outline-success'} className="fw-bold px-3 py-1 me-2" onClick={() => handleToggleActive(editUser, 100)}>
              {editUser?.userIsActive === 1 ? '퇴사 처리' : '복직 처리'}
            </Button>
            {
              (editUser?.userIsActive === 2 || editUser?.userIsActive === 0) ?
                <div />
                :
                <Button size="sm" variant="outline-secondary" className="fw-bold px-3 py-1" onClick={() => handleToggleActive(editUser, 2)}>
                  휴직 처리
                </Button>
            }
          </div>

          <Button size="sm" variant="outline-warning" className="fw-bold px-3 py-1" onClick={onOpenTempPw}>🔐 임시 비밀번호 설정</Button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>닫기</Button>
        <Button variant="primary" onClick={handleEditSave} disabled={editSaving || editUser?.userIsActive === 0}>
          {editSaving ? <Spinner as="span" animation="border" size="sm" /> : '저장'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const TempPasswordModal = ({
  tempPwUser,
  onHide,
  tempPwMsg,
  tempPwValue,
  setTempPwValue,
  handleSetTempPw,
  tempPwSaving
}) => {
  return (
    <Modal show={!!tempPwUser} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title className="fw-bold">🔐 {tempPwUser?.userName} 임시 비밀번호 설정</Modal.Title></Modal.Header>
      <Modal.Body>
        {tempPwMsg && <Alert variant={tempPwMsg.includes('설정') ? 'success' : 'danger'} className="py-2">{tempPwMsg}</Alert>}
        <Form.Group><Form.Label className="fw-bold text-muted small">임시 비밀번호</Form.Label><Form.Control type="text" value={tempPwValue} onChange={e => setTempPwValue(e.target.value)} placeholder="임시 비밀번호 입력" /></Form.Group>
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onHide}>닫기</Button><Button variant="warning" onClick={handleSetTempPw} disabled={tempPwSaving}>{tempPwSaving ? <Spinner as="span" animation="border" size="sm" /> : '설정'}</Button></Modal.Footer>
    </Modal>
  );
};

export const AddUserModal = ({
  show,
  onHide,
  addError,
  addSuccess,
  addUserRole,
  setAddUserRole,
  setAddFkUtIdx,
  addWorkPlaceIdx,
  setAddWorkPlaceIdx,
  branches,
  addFkUtIdx,
  userTypes,
  addUserId,
  setAddUserId,
  addUserPw,
  setAddUserPw,
  addUserName,
  setAddUserName,
  addUserBirth,
  setAddUserBirth,
  addUserPhone,
  setAddUserPhone,
  handleAddUser,
  addSaving
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title className="fw-bold">새로운 직원 추가</Modal.Title></Modal.Header>
      <Modal.Body>
        {addError && <Alert variant="danger" className="py-2">{addError}</Alert>}
        {addSuccess && <Alert variant="success" className="py-2">{addSuccess}</Alert>}
        <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">권한</Form.Label><Form.Select value={addUserRole} onChange={e => { setAddUserRole(e.target.value); if (e.target.value === 'WORKER') setAddFkUtIdx(''); }}><option value="WORKER">알바생</option><option value="ADMIN">직원</option></Form.Select></Form.Group>
        <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">소속 지점</Form.Label><Form.Select value={addWorkPlaceIdx} onChange={e => setAddWorkPlaceIdx(e.target.value)}>{branches.filter(b => b.wpIdx !== '').map(b => <option key={b.wpIdx} value={b.wpIdx}>{b.wpName}</option>)}</Form.Select></Form.Group>
        {addUserRole === 'ADMIN' && (<Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">직급</Form.Label><Form.Select value={addFkUtIdx} onChange={e => setAddFkUtIdx(e.target.value)}><option value="">-- 직급 선택 --</option>{userTypes.map(ut => <option key={ut.utIdx} value={ut.utIdx}>{ut.utName}</option>)}</Form.Select></Form.Group>)}
        <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">아이디 *</Form.Label><Form.Control value={addUserId} onChange={e => setAddUserId(e.target.value)} placeholder="아이디 입력" /></Form.Group>
        <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">임시 비밀번호 *</Form.Label><Form.Control type="text" value={addUserPw} onChange={e => setAddUserPw(e.target.value)} placeholder="임시 비밀번호 입력" /></Form.Group>
        <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">이름 *</Form.Label><Form.Control value={addUserName} onChange={e => setAddUserName(e.target.value)} placeholder="이름 입력" /></Form.Group>
        <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">생년월일 *</Form.Label><Form.Control type="date" value={addUserBirth} onChange={e => setAddUserBirth(e.target.value)} /></Form.Group>
        <Form.Group className="mb-3"><Form.Label className="fw-bold text-muted small">연락처 *</Form.Label><Form.Control value={addUserPhone} onChange={e => setAddUserPhone(formatPhoneNumber(e.target.value))} placeholder="예: 010-1234-5678" /></Form.Group>
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onHide}>닫기</Button><Button variant="primary" onClick={handleAddUser} disabled={addSaving}>{addSaving ? <Spinner as="span" animation="border" size="sm" /> : '등록'}</Button></Modal.Footer>
    </Modal>
  );
};

export const ArchiveReasonModal = ({
  show,
  onHide,
  archiveReason,
  setArchiveReason,
  onSubmit
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title className="fw-bold">아카이빙 데이터 조회 사유</Modal.Title></Modal.Header>
      <Modal.Body>
        <Alert variant="warning" className="small mb-3">
          보안 규정 및 인증 기준에 따라 퇴사 후 1년이 경과한 사용자의 아카이빙 데이터를 조회하려면 <strong>반드시 조회 사유를 남겨야 합니다.</strong> (감사 로그에 기록됨)
        </Alert>
        <Form.Group>
          <Form.Label className="fw-bold text-muted small">조회 사유 입력 *</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={archiveReason}
            onChange={e => setArchiveReason(e.target.value)}
            placeholder="예: 근로기준법상 체불임금 정산 확인 요청 등"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>취소</Button>
        <Button variant="primary" onClick={onSubmit}>조회하기</Button>
      </Modal.Footer>
    </Modal>
  );
};

