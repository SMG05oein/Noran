import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { fetchMyInfo, updateUserInfo, changePassword, getMyAccountDetails, fetchWorkPlaces, updateMyBankInfo } from '../api/authApi';
import useAuthStore from '../store/useAuthStore';
import { RiUser3Line, RiLockPasswordLine, RiBankCardLine, RiStore2Line, RiShieldCheckLine, RiEdit2Line } from 'react-icons/ri';
import './Main.css';

const MyPage = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 폼 상태
  const [userInfo, setUserInfo] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [fkWorkPlaceIdx, setFkWorkPlaceIdx] = useState(1);
  const [userBank, setUserBank] = useState('');
  const [userAccountName, setUserAccountName] = useState('');
  const [userAccountNumber, setUserAccountNumber] = useState('');
  const [bankConsentAgreed, setBankConsentAgreed] = useState(false);

  // 비밀번호 변경 팝업 상태
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // 계좌 원문 조회 상태
  const [accountDetails, setAccountDetails] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);

  // 지점 목록
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    loadMyInfo();
  }, []);

  const loadMyInfo = async () => {
    setLoading(true);
    
    // 지점 목록 먼저 가져오기
    let workPlaceList = [];
    const wpRes = await fetchWorkPlaces();
    if (wpRes.success && wpRes.data) {
      workPlaceList = wpRes.data;
      setBranches(workPlaceList);
    }

    const res = await fetchMyInfo();
    if (res.success && res.data) {
      setUserInfo(res.data);
      setUserName(res.data.userName || '');
      setUserEmail(res.data.userEmail || '');
      setUserPhone(res.data.userPhone || '');
      setUserBank(res.data.userBank || '');
      setUserAccountName(res.data.userAccountName || '');
      setUserAccountNumber(res.data.userAccountNumber || '');
      
      // 내 지점 이름과 일치하는 wpIdx 찾기
      const myBranchName = res.data.workPlaceName;
      const matchedBranch = workPlaceList.find(b => b.wpName === myBranchName);
      if (matchedBranch) {
        setFkWorkPlaceIdx(matchedBranch.wpIdx);
      } else if (workPlaceList.length > 0) {
        setFkWorkPlaceIdx(workPlaceList[0].wpIdx);
      }
    } else {
      setError('내 정보를 불러오지 못했습니다.');
    }
    setLoading(false);
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    let formatted = val;
    if (val.length > 3 && val.length <= 7) formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
    else if (val.length > 7) formatted = `${val.slice(0, 3)}-${val.slice(3, 7)}-${val.slice(7, 11)}`;
    setUserPhone(formatted);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!/^\d{3}-\d{3,4}-\d{4}$/.test(userPhone)) {
      return setError('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
    }

    setSaving(true);
    const payload = { 
      userName, 
      userEmail, 
      userPhone, 
      fkWorkPlaceIdx
    };
    const res = await updateUserInfo(userInfo.userIdx, payload);
    setSaving(false);

    if (res.success) {
      setSuccess('정보가 성공적으로 수정되었습니다.');
      loadMyInfo();
    } else {
      setError(res.error || '수정에 실패했습니다.');
    }
  };

  const handleUpdateBankInfo = async () => {
    setError('');
    setSuccess('');
    if (!userBank || !userAccountName || !userAccountNumber) {
      return setError('은행명, 예금주, 계좌번호를 모두 입력해주세요.');
    }
    if (!bankConsentAgreed) {
      return setError('개인정보 수집 및 이용에 동의하셔야 합니다.');
    }
    setBankSaving(true);
    const res = await updateMyBankInfo({ userBank, userAccountName, userAccountNumber, bankConsentAgreed });
    setBankSaving(false);
    if (res.success) {
      setSuccess('은행 정보가 성공적으로 수정되었습니다.');
      setAccountDetails(null);
      setBankConsentAgreed(false);
      loadMyInfo();
    } else {
      setError(res.error || '은행 정보 수정에 실패했습니다.');
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!currentPw || !newPw) return setPwError('현재 비밀번호와 새 비밀번호를 모두 입력해주세요.');
    if (newPw !== newPwConfirm) return setPwError('새 비밀번호가 일치하지 않습니다.');

    setPwSaving(true);
    const res = await changePassword(currentPw, newPw);
    setPwSaving(false);
    if (res.success) {
      setPwSuccess('비밀번호가 성공적으로 변경되었습니다!');
      setCurrentPw('');
      setNewPw('');
      setNewPwConfirm('');
    } else {
      setPwError(res.error || '비밀번호 변경에 실패했습니다.');
    }
  };

  const handleRevealAccount = async () => {
    setAccountLoading(true);
    const res = await getMyAccountDetails();
    setAccountLoading(false);
    if (res.success) {
      setAccountDetails(res.data);
      // 원문 조회 시 실제 입력 폼 값도 원문으로 교체
      setUserAccountNumber(res.data.userAccountNumber || '');
      if (res.data.userBank) setUserBank(res.data.userBank);
      if (res.data.userAccountName) setUserAccountName(res.data.userAccountName);
    }
  };

  const handleClosePwModal = () => {
    setShowPwModal(false);
    setCurrentPw('');
    setNewPw('');
    setNewPwConfirm('');
    setPwError('');
    setPwSuccess('');
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="py-4 py-md-5 mb-5" style={{ maxWidth: '640px' }}>
      <div className="mb-4">
        <h2 className="fw-bold text-dark mb-1">내 정보 관리</h2>
        <p className="text-muted small mb-0">프로필 정보 및 급여 지급 계좌를 안전하게 관리합니다.</p>
      </div>

      {error && <Alert variant="danger" className="rounded-3 py-2">{error}</Alert>}
      {success && <Alert variant="success" className="rounded-3 py-2">{success}</Alert>}

      {/* 기본 정보 (수정 불가) */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-4">
          <div className="fw-bold text-muted small mb-3 d-flex align-items-center gap-1">
            <RiShieldCheckLine className="text-primary" /> 기본 계정 정보
          </div>
          <div className="p-3 rounded-3" style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}>
             <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                <div className="text-muted fw-bold small">아이디</div>
                <div className="fw-bold" style={{ color: 'var(--color-input-text)' }}>{userInfo?.userId || '-'}</div>
             </div>
             <div className="d-flex align-items-center justify-content-between">
                <div className="text-muted fw-bold small">직급 및 역할</div>
                <div>
                  <Badge bg="primary" className="px-2 py-1 me-1">{userInfo?.userTypeName || '직원'}</Badge>
                  {userInfo?.is_admin === 1 && <Badge bg="danger" className="px-2 py-1">관리자</Badge>}
                </div>
             </div>
          </div>
        </Card.Body>
      </Card>

      {/* 연락처 및 소속 정보 (수정 가능) */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-4">
          <div className="fw-bold text-muted small mb-3 d-flex align-items-center gap-1">
            <RiEdit2Line className="text-primary" /> 연락처 및 소속 정보 수정
          </div>
          <Form onSubmit={handleUpdate}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">이름</Form.Label>
              <Form.Control type="text" value={userName} onChange={e => setUserName(e.target.value)} required className="custom-input" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">전화번호</Form.Label>
              <Form.Control type="text" value={userPhone} onChange={handlePhoneChange} required className="custom-input" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">이메일</Form.Label>
              <Form.Control type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="custom-input" />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">소속 지점</Form.Label>
              <Form.Select value={fkWorkPlaceIdx} onChange={e => setFkWorkPlaceIdx(Number(e.target.value))} className="custom-input">
                {branches.map(b => (
                  <option key={b.wpIdx} value={b.wpIdx}>
                    {b.wpName}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <div className="d-flex gap-2 flex-wrap">
              <Button disabled={saving} variant="primary" type="submit" className="flex-grow-1 fw-bold py-2 rounded-3 shadow-sm">
                {saving ? <Spinner as="span" animation="border" size="sm" /> : "정보 수정 저장"}
              </Button>
              <Button variant="outline-secondary" className="fw-bold py-2 px-3 rounded-3" onClick={() => setShowPwModal(true)} type="button">
                <RiLockPasswordLine className="me-1" /> 비밀번호 변경
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* 계좌 정보 수정 (별도 영역) */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-4">
          <div className="fw-bold text-muted small mb-3 d-flex align-items-center gap-1">
            <RiBankCardLine className="text-primary" /> 급여 계좌 정보
          </div>
          
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">은행명</Form.Label>
            <Form.Control 
              type="text" 
              value={userBank} 
              onChange={e => setUserBank(e.target.value)} 
              placeholder="예: 카카오뱅크, 신한은행"
              disabled={userInfo?.userAccountNumber && !accountDetails}
              className="custom-input"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">예금주</Form.Label>
            <Form.Control 
              type="text" 
              value={userAccountName} 
              onChange={e => setUserAccountName(e.target.value)} 
              placeholder="예금주 성명"
              disabled={userInfo?.userAccountNumber && !accountDetails}
              className="custom-input"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">계좌번호 (숫자만)</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control 
                type="text" 
                value={userAccountNumber} 
                onChange={e => setUserAccountNumber(e.target.value.replace(/[^0-9]/g, ''))} 
                placeholder="계좌번호 입력"
                disabled={userInfo?.userAccountNumber && !accountDetails}
                className="custom-input flex-grow-1"
              />
              {userInfo?.userAccountNumber && !accountDetails && (
                <Button size="sm" variant="outline-secondary" className="px-3 text-nowrap rounded-3 fw-bold" onClick={handleRevealAccount} disabled={accountLoading}>
                  {accountLoading ? <Spinner as="span" animation="border" size="sm" /> : '원문 조회 및 수정'}
                </Button>
              )}
            </div>
          </Form.Group>

          {/* 정보 수정/입력 모드일 때만 동의서 노출 */}
          {(!userInfo?.userAccountNumber || accountDetails) && (
            <div className="p-3 rounded-3 mb-3" style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}>
              <div className="fw-bold small mb-2 text-dark">📌 [개인정보 수집 및 이용 동의]</div>
              <ul className="text-muted small ps-3 mb-3">
                <li><strong className="text-dark">수집 목적</strong>: 급여 지급 및 정산</li>
                <li><strong className="text-dark">수집 항목</strong>: 은행명, 예금주, 계좌번호</li>
                <li>
                  <strong className="text-dark">보유 및 이용 기간</strong>: 근로 계약 종료 시까지 이용하며, 관계 법령(소득세법 5년, 근로기준법 3년)에 따라 보존합니다.
                </li>
                <li>
                  <strong className="text-dark">동의 거부권 및 불이익</strong>: 귀하는 위 개인정보 수집에 대한 동의를 거부할 권리가 있습니다. 단, 동의 거부 시 급여 이체 및 정산 처리가 불가능합니다.
                </li>
              </ul>
              <Form.Check 
                type="checkbox"
                id="bankConsent"
                label={<span className="fw-bold small text-primary">[필수] 위 개인정보 수집 및 이용에 동의합니다.</span>}
                checked={bankConsentAgreed}
                onChange={e => setBankConsentAgreed(e.target.checked)}
              />
            </div>
          )}

          <Button 
            variant="success" 
            className="w-100 fw-bold py-2 rounded-3 shadow-sm" 
            onClick={handleUpdateBankInfo} 
            disabled={bankSaving || (userInfo?.userAccountNumber && !accountDetails) || (!userInfo?.userAccountNumber || accountDetails) && !bankConsentAgreed}
          >
            {bankSaving ? <Spinner as="span" animation="border" size="sm" /> : '은행 정보 저장'}
          </Button>
        </Card.Body>
      </Card>

      {/* 비밀번호 변경 모달 */}
      <Modal show={showPwModal} onHide={handleClosePwModal} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-dark fs-5">
            <RiLockPasswordLine className="me-1 text-primary" /> 비밀번호 변경
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {pwError && <Alert variant="danger" className="rounded-3 py-2 text-center">{pwError}</Alert>}
          {pwSuccess && <Alert variant="success" className="rounded-3 py-2 text-center">{pwSuccess}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">현재 비밀번호</Form.Label>
            <Form.Control type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="현재 비밀번호 입력" className="custom-input" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-muted small">새 비밀번호</Form.Label>
            <Form.Control type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="새 비밀번호 입력" className="custom-input" />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold text-muted small">새 비밀번호 확인</Form.Label>
            <Form.Control type="password" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)} placeholder="새 비밀번호 재입력" className="custom-input" />
          </Form.Group>
          <Button variant="primary" onClick={handleChangePassword} disabled={pwSaving} className="w-100 py-2 fw-bold rounded-3">
            {pwSaving ? <Spinner as="span" animation="border" size="sm" /> : "비밀번호 변경하기"}
          </Button>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default MyPage;
