import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Alert } from 'react-bootstrap';
import { fetchMyInfo, updateUserInfo, changePassword, getMyAccountDetails, fetchWorkPlaces, updateMyBankInfo, withdrawUser, fetchBanks } from '../api/authApi';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';
import MyPageAccountCard from '../components/myPage/MyPageAccountCard';
import MyPageProfileForm from '../components/myPage/MyPageProfileForm';
import MyPageModals from '../components/myPage/MyPageModals';
import AlarmSettingsCard from '../components/AlarmSettingsCard';
import './Main.css';

const MyPage = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      let birthStr = '';
      if (res.data.userBirth) {
        if (Array.isArray(res.data.userBirth) && res.data.userBirth.length >= 3) {
          birthStr = `${res.data.userBirth[0]}-${String(res.data.userBirth[1]).padStart(2, '0')}-${String(res.data.userBirth[2]).padStart(2, '0')}`;
        } else if (typeof res.data.userBirth === 'string') {
          birthStr = res.data.userBirth.split('T')[0];
        } else {
          birthStr = String(res.data.userBirth);
        }
      }
      setUserBirth(birthStr);
      setUserEmail(res.data.userEmail || '');
      setUserPhone(res.data.userPhone || '');
      setEmailConsentAgreed(res.data.emailConsentAgreed === 1 || res.data.emailConsentAgreed === true);
      setUserBank(res.data.bankCode || res.data.userBank || '');
      setUserAccountName(res.data.userAccountName || '');
      setUserAccountNumber(res.data.userAccountNumber || '');

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
    <Container className="py-3 py-md-5 mb-5" style={{ maxWidth: '640px' }}>
      <div className="mb-4">
        <h2 className="fw-bold mb-1" style={{ color: 'var(--color-text-main)' }}>내 정보 관리</h2>
        <p className="text-muted small mb-0">프로필 정보 및 급여 지급 계좌를 안전하게 관리합니다.</p>
      </div>

      {error && <Alert variant="danger" className="rounded-3 py-2">{error}</Alert>}
      {success && <Alert variant="success" className="rounded-3 py-2">{success}</Alert>}

      <AlarmSettingsCard />

      <MyPageAccountCard userInfo={userInfo} />

      <MyPageProfileForm
        userInfo={userInfo}
        userName={userName}
        handleUserNameChange={handleUserNameChange}
        userNameError={userNameError}
        userNameRef={userNameRef}
        userBirth={userBirth}
        handleBirthChange={handleBirthChange}
        birthError={birthError}
        birthRef={birthRef}
        userPhone={userPhone}
        handlePhoneChange={handlePhoneChange}
        phoneWarn={phoneWarn}
        phoneError={phoneError}
        phoneRef={phoneRef}
        userEmail={userEmail}
        handleUserEmailChange={handleUserEmailChange}
        userEmailError={userEmailError}
        emailRef={emailRef}
        emailConsentAgreed={emailConsentAgreed}
        setEmailConsentAgreed={setEmailConsentAgreed}
        fkWorkPlaceIdx={fkWorkPlaceIdx}
        setFkWorkPlaceIdx={setFkWorkPlaceIdx}
        branches={branches}
        userBank={userBank}
        setUserBank={setUserBank}
        bankRef={bankRef}
        banks={banks}
        userAccountName={userAccountName}
        setUserAccountName={setUserAccountName}
        accountNameRef={accountNameRef}
        userAccountNumber={userAccountNumber}
        setUserAccountNumber={setUserAccountNumber}
        accountNumRef={accountNumRef}
        accountDetails={accountDetails}
        accountLoading={accountLoading}
        handleRevealAccount={handleRevealAccount}
        saving={saving}
        onSubmit={handleUpdate}
        onOpenPwModal={() => setShowPwModal(true)}
      />

      <div className="text-end mt-4">
        <Button variant="outline-danger" size="sm" className="fw-bold px-3 py-2" onClick={() => setShowWithdrawModal(true)}>
          회원 탈퇴
        </Button>
      </div>

      <MyPageModals
        showPwModal={showPwModal}
        onClosePwModal={handleClosePwModal}
        currentPw={currentPw}
        setCurrentPw={setCurrentPw}
        newPw={newPw}
        setNewPw={setNewPw}
        newPwConfirm={newPwConfirm}
        setNewPwConfirm={setNewPwConfirm}
        pwError={pwError}
        pwSuccess={pwSuccess}
        pwSaving={pwSaving}
        onChangePassword={handleChangePassword}
        showWithdrawModal={showWithdrawModal}
        onCloseWithdrawModal={() => setShowWithdrawModal(false)}
        withdrawError={withdrawError}
        withdrawSaving={withdrawSaving}
        onWithdraw={handleWithdraw}
      />
    </Container>
  );
};

export default MyPage;
