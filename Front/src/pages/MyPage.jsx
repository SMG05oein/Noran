import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { fetchMyInfo, updateUserInfo, changePassword, getMyAccountDetails, fetchWorkPlaces, updateMyBankInfo, withdrawUser, fetchBanks } from '../api/authApi';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { RiUser3Line, RiLockPasswordLine, RiBankCardLine, RiStore2Line, RiShieldCheckLine, RiEdit2Line } from 'react-icons/ri';
import './Main.css';
import Loading from '../components/Loading';

const MyPage = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [userNameError, setUserNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneWarn, setPhoneWarn] = useState('');
  const [userEmailError, setUserEmailError] = useState('');
  const [birthError, setBirthError] = useState('');

  const userNameRef = useRef(null);
  const birthRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const bankRef = useRef(null);
  const accountNameRef = useRef(null);
  const accountNumRef = useRef(null);

  // 폼 상태
  const [userInfo, setUserInfo] = useState(null);
  const [userName, setUserName] = useState('');
  const [userBirth, setUserBirth] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [emailConsentAgreed, setEmailConsentAgreed] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [fkWorkPlaceIdx, setFkWorkPlaceIdx] = useState(1);
  const [userBank, setUserBank] = useState('');
  const [userAccountName, setUserAccountName] = useState('');
  const [userAccountNumber, setUserAccountNumber] = useState('');
  const [banks, setBanks] = useState([]);

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

  // 회원 탈퇴 모달 상태
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawSaving, setWithdrawSaving] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

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

    const bankRes = await fetchBanks();
    if (bankRes.success) {
      const list = Array.isArray(bankRes.data) ? bankRes.data : (bankRes.data?.content || []);
      setBanks(list);
    }

    const res = await fetchMyInfo();
    if (res.success && res.data) {
      setUserInfo(res.data);
      setUserName(res.data.userName || '');
      setUserBirth(res.data.userBirth || '');
      setUserEmail(res.data.userEmail || '');
      setUserPhone(res.data.userPhone || '');
      setEmailConsentAgreed(res.data.emailConsentAgreed === 1 || res.data.emailConsentAgreed === true);
      setUserBank(res.data.bankCode || res.data.userBank || '');
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

  const calculateAge = (birth) => {
    const today = new Date();
    const birthDateObj = new Date(birth);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  const handleBirthChange = (e) => {
    const val = e.target.value;
    setUserBirth(val);
    if (val) {
      if (calculateAge(val) < 15) {
        setBirthError('만 15세 미만은 가입 및 정보 수정이 제한됩니다.');
      } else {
        setBirthError('');
      }
    } else {
      setBirthError('');
    }
  };

  const handleUserNameChange = (e) => {
    const val = e.target.value;
    if (/[^ㄱ-ㅎㅏ-ㅣ가-힣]/.test(val)) {
      setUserNameError('이름에는 한글만 입력할 수 있습니다. (띄어쓰기, 숫자, 영문 등 불가)');
    } else {
      setUserNameError('');
    }
    setUserName(val.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣]/g, ''));
  };

  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    if (/[^0-9-]/.test(rawVal)) {
      setPhoneWarn('연락처는 숫자만 입력 가능합니다.');
    } else {
      setPhoneWarn('');
    }
    const val = rawVal.replace(/[^0-9]/g, '');
    let formatted = val;
    if (val.length > 3 && val.length <= 7) formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
    else if (val.length > 7) formatted = `${val.slice(0, 3)}-${val.slice(3, 7)}-${val.slice(7, 11)}`;
    setUserPhone(formatted);

    if (formatted.length > 0 && !/^\d{3}-\d{3,4}-\d{4}$/.test(formatted)) {
      setPhoneError('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)');
    } else {
      setPhoneError('');
    }
  };

  const handleUserEmailChange = (e) => {
    const val = e.target.value;
    setUserEmail(val);
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setUserEmailError('유효한 이메일 형식이 아닙니다.');
    } else {
      setUserEmailError('');
    }
  };

  const hasErrors = !!userNameError || !!phoneError || !!userEmailError || !!birthError;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (userNameError) {
      userNameRef.current?.focus();
      return setError('이름 입력 형식을 확인해주세요.');
    }
    if (birthError) {
      birthRef.current?.focus();
      return setError('만 15세 미만은 가입 및 정보 수정이 제한됩니다.');
    }
    if (phoneError || !/^\d{3}-\d{3,4}-\d{4}$/.test(userPhone)) {
      phoneRef.current?.focus();
      return setError('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
    }
    if (userEmailError) {
      emailRef.current?.focus();
      return setError('유효한 이메일 형식이 아닙니다.');
    }
    if (!userBank) {
      bankRef.current?.focus();
      return setError('은행명을 선택해주세요.');
    }
    if (!userAccountName) {
      accountNameRef.current?.focus();
      return setError('예금주 성명을 입력해주세요.');
    }
    if (!userAccountNumber) {
      accountNumRef.current?.focus();
      return setError('계좌번호를 입력해주세요.');
    }
    if (hasErrors) {
      return setError('입력 형식이 올바르지 않은 항목이 있습니다. 입력란 아래의 경고 메시지를 확인해주세요.');
    }

    setSaving(true);
    const payload = {
      userName,
      userBirth,
      userEmail,
      emailConsentAgreed: emailConsentAgreed ? 1 : 0,
      userPhone,
      fkWorkPlaceIdx
    };
    
    const bankPayload = { bankCode: userBank, userAccountName };
    if (userAccountNumber !== '기재') {
      bankPayload.userAccountNumber = userAccountNumber;
    }

    // 두 API를 병렬로 호출 (은행정보 업데이트 포함)
    const [resInfo, resBank] = await Promise.all([
      updateUserInfo(userInfo.userIdx, payload),
      updateMyBankInfo(bankPayload)
    ]);
    
    setSaving(false);

    if (resInfo.success && resBank.success) {
      setSuccess('정보가 성공적으로 수정되었습니다.');
      setAccountDetails(null);
      loadMyInfo();
    } else {
      setError(resInfo.error || resBank.error || '수정에 실패했습니다.');
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
      if (res.data.bankCode || res.data.userBank) setUserBank(res.data.bankCode || res.data.userBank);
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

  const handleWithdraw = async () => {
    setWithdrawError('');
    setWithdrawSaving(true);
    const res = await withdrawUser();
    setWithdrawSaving(false);

    if (res.success) {
      alert('회원 탈퇴가 완료되었습니다.');
      logout();
      navigate('/login');
    } else {
      setWithdrawError(res.error || '회원 탈퇴에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <Container className="py-5"><Loading /></Container>
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
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
              <div className="text-muted fw-bold small">직급 및 역할</div>
              <div>
                <Badge bg="primary" className="px-2 py-1 me-1">{userInfo?.userTypeName || '직원'}</Badge>
                {userInfo?.is_admin === 1 && <Badge bg="danger" className="px-2 py-1">관리자</Badge>}
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <div className="text-muted fw-bold small">시급</div>
              <div className="fw-bold text-success">
                {userInfo?.userHourlyWage != null ? `${Number(userInfo.userHourlyWage).toLocaleString()}원` : '관리자 미기재'}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* 내 정보 및 은행 정보 수정 */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-4">
          <div className="fw-bold text-muted small mb-3 d-flex align-items-center gap-1">
            <RiEdit2Line className="text-primary" /> 계정, 연락처, 급여 정보 관리
          </div>
          {userInfo?.userIsActive === 0 && (
            <Alert variant="danger" className="py-2 small fw-bold">퇴사자의 정보는 보호를 위해 수정할 수 없습니다.</Alert>
          )}
          <Form onSubmit={handleUpdate}>
            <fieldset disabled={userInfo?.userIsActive === 0}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">이름 <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" value={userName} onChange={handleUserNameChange} required ref={userNameRef} className="custom-input" />
              {userNameError && <div className="text-danger small mt-1">{userNameError}</div>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">생년월일 <span className="text-danger">*</span></Form.Label>
              <Form.Control type="date" value={userBirth} onChange={handleBirthChange} required ref={birthRef} className="custom-input" />
              {birthError && <div className="text-danger small mt-1">{birthError}</div>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">전화번호 <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" value={userPhone} onChange={handlePhoneChange} required ref={phoneRef} className="custom-input" />
              {phoneWarn && <div className="text-warning small mt-1">{phoneWarn}</div>}
              {phoneError && <div className="text-danger small mt-1">{phoneError}</div>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">이메일</Form.Label>
              <Form.Control type="email" value={userEmail} onChange={handleUserEmailChange} ref={emailRef} className="custom-input mb-2" />
              {userEmailError && <div className="text-danger small mt-1 mb-2">{userEmailError}</div>}
              <Form.Check
                type="switch"
                id="email-consent-switch"
                label="이벤트 및 공지사항 이메일 수신 동의"
                checked={emailConsentAgreed}
                onChange={e => setEmailConsentAgreed(e.target.checked)}
                className="text-muted small"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">소속 지점 <span className="text-danger">*</span></Form.Label>
              <Form.Select value={fkWorkPlaceIdx} onChange={e => setFkWorkPlaceIdx(Number(e.target.value))} className="custom-input">
                {branches.map(b => (
                  <option key={b.wpIdx} value={b.wpIdx}>
                    {b.wpName}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3 mt-4 border-top pt-3">
              <Form.Label className="fw-bold text-muted small d-flex align-items-center gap-1">
                <RiBankCardLine className="text-primary" /> 은행명 <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select
                value={userBank}
                onChange={e => setUserBank(e.target.value)}
                ref={bankRef}
                className="custom-input"
              >
                <option value="">은행 선택</option>
                {banks.map(bank => (
                  <option key={bank.bankCode || bank.code} value={bank.bankCode || bank.code}>
                    {bank.bankName || bank.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">예금주 <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                value={userAccountName}
                onChange={e => setUserAccountName(e.target.value)}
                ref={accountNameRef}
                placeholder="예금주 성명"
                className="custom-input"
              />
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-muted small">계좌번호 <span className="text-danger">*</span></Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  value={userAccountNumber}
                  onChange={e => setUserAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  ref={accountNumRef}
                  placeholder="계좌번호 입력"
                  disabled={userInfo?.userAccountNumber && !accountDetails}
                  className="custom-input flex-grow-1"
                />
                {userInfo?.userAccountNumber && !accountDetails && (
                  <Button size="sm" variant="outline-secondary" className="px-3 text-nowrap rounded-3 fw-bold" onClick={handleRevealAccount} disabled={accountLoading}>
                    {accountLoading ? <Spinner as="span" animation="border" size="sm" /> : '원문 조회'}
                  </Button>
                )}
              </div>
            </Form.Group>

            <div className="d-flex gap-2 flex-wrap">
              <Button disabled={saving || userInfo?.userIsActive === 0} variant="primary" type="submit" className="flex-grow-1 fw-bold py-2 rounded-3 shadow-sm" title={userInfo?.userIsActive === 0 ? "퇴사자의 정보는 수정할 수 없습니다." : ""}>
                {saving ? <Spinner as="span" animation="border" size="sm" /> : "수정"}
              </Button>
              <Button variant="outline-secondary" className="fw-bold py-2 px-3 rounded-3" onClick={() => setShowPwModal(true)} type="button">
                <RiLockPasswordLine className="me-1" /> 비밀번호 변경
              </Button>
            </div>
            </fieldset>
          </Form>
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

      {/* 회원 탈퇴 영역 */}
      <div className="text-end mt-4">
        <Button variant="outline-danger" size="sm" className="fw-bold px-3 py-2" onClick={() => setShowWithdrawModal(true)}>
          회원 탈퇴
        </Button>
      </div>

      {/* 회원 탈퇴 모달 */}
      <Modal show={showWithdrawModal} onHide={() => setShowWithdrawModal(false)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold text-danger fs-5">
            회원 탈퇴
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {withdrawError && <Alert variant="danger" className="rounded-3 py-2 text-center">{withdrawError}</Alert>}
          <p className="fw-bold text-dark mb-2">정말로 해당 서비스를 탈퇴하시겠습니까?</p>
          <ul className="text-muted small ps-3 mb-4">
            <li>탈퇴 시 계정은 즉시 비활성화되어 로그인할 수 없습니다.</li>
            <li>관련 법령(국세기본법, 근로기준법 등)에 따라 급여 정산 및 근태 기록은 최대 5년 동안 보관 후 파기됩니다.</li>
            <li>이 작업은 되돌릴 수 없습니다.</li>
          </ul>

          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={() => setShowWithdrawModal(false)} className="flex-grow-1 py-2 fw-bold rounded-3">
              취소
            </Button>
            <Button variant="danger" onClick={handleWithdraw} disabled={withdrawSaving} className="flex-grow-1 py-2 fw-bold rounded-3">
              {withdrawSaving ? <Spinner as="span" animation="border" size="sm" /> : "탈퇴하기"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default MyPage;
