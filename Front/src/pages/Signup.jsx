import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authSignup, fetchWorkPlaces, fetchBanks } from '../api/authApi';
import { Form, Button, Container, Card, Alert, Spinner } from 'react-bootstrap';
import { RiRestaurantLine } from 'react-icons/ri';
import TermsModal from '../components/TermsModal';
import SignupFormFields from '../components/signup/SignupFormFields';
import SignupTermsSection from '../components/signup/SignupTermsSection';
import './Auth.css';

const Signup = () => {
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState(1);
  const [userBank, setUserBank] = useState('');
  const [userAccountName, setUserAccountName] = useState('');
  const [userAccountNumber, setUserAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success] = useState(false);
  const [successMessage] = useState('');
  const [termsConsent, setTermsConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);

  // 모달 상태 ('terms' | 'consent' | 'privacy' | null)
  const [modalType, setModalType] = useState(null);
  const [isSequentialAll, setIsSequentialAll] = useState(false);

  const [userIdError, setUserIdError] = useState('');
  const [pwMatchError, setPwMatchError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneWarn, setPhoneWarn] = useState('');
  const [userNameError, setUserNameError] = useState('');
  const [userEmailError, setUserEmailError] = useState('');
  const [birthError, setBirthError] = useState('');

  const [banks, setBanks] = useState([]);
  const [branches, setBranches] = useState([]);

  const navigate = useNavigate();

  const userNameRef = useRef(null);
  const birthRef = useRef(null);
  const userIdRef = useRef(null);
  const pwConfirmRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const bankRef = useRef(null);
  const accountNameRef = useRef(null);
  const accountNumRef = useRef(null);

  useEffect(() => {
    const loadWorkPlaces = async () => {
      const res = await fetchWorkPlaces();
      if (res.success && res.data) {
        setBranches(res.data);
        if (res.data.length > 0) {
          setBranch(res.data[0].wpIdx);
        }
      }
    };
    const loadBanks = async () => {
      const res = await fetchBanks();
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        setBanks(list);
      }
    };
    loadWorkPlaces();
    loadBanks();
  }, []);

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
    setBirthDate(val);
    if (val) {
      if (calculateAge(val) < 15) {
        setBirthError('만 15세 미만은 가입 및 이용이 제한됩니다.');
      } else {
        setBirthError('');
      }
    } else {
      setBirthError('');
    }
  };

  // 이름 입력 (한글 이외의 문자 입력 시 경고)
  const handleUserNameChange = (e) => {
    const val = e.target.value;
    if (/[^ㄱ-ㅎㅏ-ㅣ가-힣]/.test(val)) {
      setUserNameError('이름에는 한글만 입력할 수 있습니다. (띄어쓰기, 숫자, 영문 등 불가)');
    } else {
      setUserNameError('');
    }
    setUserName(val.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣]/g, ''));
  };

  // 아이디 입력 (정규식 필터링 없이 경고 메시지만 표시)
  const handleUserIdChange = (e) => {
    const val = e.target.value;
    setUserId(val);
    if (val && !/^[A-Za-z0-9]+$/.test(val)) {
      setUserIdError('영문자와 숫자만 입력할 수 있습니다.');
    } else {
      setUserIdError('');
    }
  };

  // 비밀번호 확인 — 일치 여부 실시간 체크
  const handlePasswordConfirmChange = (e) => {
    const val = e.target.value;
    setPasswordConfirm(val);
    if (password && val && val !== password) {
      setPwMatchError('비밀번호가 일치하지 않습니다.');
    } else {
      setPwMatchError('');
    }
  };

  // 비밀번호 변경 시에도 확인 필드 재체크
  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordConfirm && val !== passwordConfirm) {
      setPwMatchError('비밀번호가 일치하지 않습니다.');
    } else {
      setPwMatchError('');
    }
  };

  // 전화번호 — 자동 하이픈 + 실시간 형식 체크
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
    setPhone(formatted);

    // 입력이 완성된 경우에만 정규식 체크
    if (formatted.length > 0 && !/^\d{3}-\d{3,4}-\d{4}$/.test(formatted)) {
      setPhoneError('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)');
    } else {
      setPhoneError('');
    }
  };

  // 이메일 형식 체크
  const handleUserEmailChange = (e) => {
    const val = e.target.value;
    setUserEmail(val);
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setUserEmailError('유효한 이메일 형식이 아닙니다.');
    } else {
      setUserEmailError('');
    }
  };

  const hasErrors = !!userIdError || !!pwMatchError || !!phoneError || !!userEmailError || !!birthError;

  const handleSignup = async (e) => {
    e.preventDefault();

    // 제출 시 최종 검증
    if (!termsConsent || !privacyConsent) {
      return alert('필수 규정에 모두 동의해야 회원가입이 가능합니다.');
    }

    if (userNameError) {
      userNameRef.current?.focus();
      return alert('이름 입력 형식을 확인해주세요.');
    }
    if (birthError) {
      birthRef.current?.focus();
      return alert('만 15세 미만은 가입 및 이용이 제한됩니다.');
    }
    if (userIdError) {
      userIdRef.current?.focus();
      return alert(userIdError.includes('이미') || userIdError.includes('재사용')
        ? userIdError
        : '아이디 입력 형식을 확인해주세요.');
    }
    if (pwMatchError || password !== passwordConfirm) {
      pwConfirmRef.current?.focus();
      return alert('비밀번호가 일치하지 않습니다.');
    }
    if (phoneError || phoneWarn || !/^\d{3}-\d{3,4}-\d{4}$/.test(phone)) {
      phoneRef.current?.focus();
      return alert(phoneError || phoneWarn || '전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
    }
    if (userEmailError) {
      emailRef.current?.focus();
      return alert('유효한 이메일 형식이 아닙니다.');
    }
    if (!userBank) {
      bankRef.current?.focus();
      return alert('은행명을 선택해주세요.');
    }
    if (!userAccountNumber) {
      accountNumRef.current?.focus();
      return alert('계좌번호를 입력해주세요.');
    }
    if (!userAccountName) {
      accountNameRef.current?.focus();
      return alert('예금주 성명을 입력해주세요.');
    }

    if (hasErrors) {
      return alert('입력 형식이 올바르지 않은 항목이 있습니다. 입력란 아래의 경고 메시지를 확인해주세요.');
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        userId,
        userPw: password,
        userName,
        userBirth: birthDate,
        userEmail: userEmail || null,
        emailConsentAgreed: emailConsent,
        userPhone: phone,
        bankCode: userBank,
        userAccountName,
        userAccountNumber,
        fkUtIdx: 1,
        fkWorkPlaceIdx: parseInt(branch),
      };

      const response = await authSignup(payload);
      if (response.success) {
        const msg = typeof response.data === 'string'
          ? response.data
          : response.data?.msg || '회원가입 성공! 로그인 페이지로 이동합니다.';
        alert(msg);
        navigate('/login');
      } else {
        const errMsg = response.error || '회원가입에 실패했습니다.';
        const isIdDup = /아이디/.test(errMsg) && (/이미|중복|재사용/.test(errMsg));
        const isPhoneDup = /휴대폰|전화|연락처/.test(errMsg) && (/이미|중복/.test(errMsg));

        if (isIdDup) {
          setUserIdError(errMsg);
          setError('');
          setTimeout(() => userIdRef.current?.focus(), 0);
        } else if (isPhoneDup) {
          setPhoneError(errMsg);
          setPhoneWarn('');
          setError('');
          setTimeout(() => phoneRef.current?.focus(), 0);
        } else {
          setError(errMsg);
        }
        alert(errMsg);
      }
    } catch (err) {
      alert('서버 오류가 발생했습니다.');
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Container className="d-flex align-items-center justify-content-center p-4">
        <div className="w-100" style={{ maxWidth: "460px" }}>
          <Card className="auth-card border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="auth-header">
                <div className="auth-brand-logo shadow-sm">
                  <RiRestaurantLine />
                </div>
                <h1 className="auth-title">회원가입</h1>
              </div>

              {error && <Alert variant="danger" className="rounded-3 py-2 text-center">{error}</Alert>}
              {success && <Alert variant="success" className="rounded-3 py-2 text-center">{successMessage}</Alert>}

              <Form onSubmit={handleSignup}>
                <SignupFormFields
                  userName={userName}
                  handleUserNameChange={handleUserNameChange}
                  userNameError={userNameError}
                  userNameRef={userNameRef}
                  birthDate={birthDate}
                  handleBirthChange={handleBirthChange}
                  birthError={birthError}
                  birthRef={birthRef}
                  userId={userId}
                  handleUserIdChange={handleUserIdChange}
                  userIdError={userIdError}
                  userIdRef={userIdRef}
                  userEmail={userEmail}
                  handleUserEmailChange={handleUserEmailChange}
                  userEmailError={userEmailError}
                  emailRef={emailRef}
                  password={password}
                  handlePasswordChange={handlePasswordChange}
                  passwordConfirm={passwordConfirm}
                  handlePasswordConfirmChange={handlePasswordConfirmChange}
                  pwMatchError={pwMatchError}
                  pwConfirmRef={pwConfirmRef}
                  phone={phone}
                  handlePhoneChange={handlePhoneChange}
                  phoneError={phoneError}
                  phoneWarn={phoneWarn}
                  phoneRef={phoneRef}
                  userBank={userBank}
                  setUserBank={setUserBank}
                  bankRef={bankRef}
                  banks={banks}
                  userAccountNumber={userAccountNumber}
                  setUserAccountNumber={setUserAccountNumber}
                  accountNumRef={accountNumRef}
                  userAccountName={userAccountName}
                  setUserAccountName={setUserAccountName}
                  accountNameRef={accountNameRef}
                  branch={branch}
                  setBranch={setBranch}
                  branches={branches}
                />

                <SignupTermsSection
                  termsConsent={termsConsent}
                  setTermsConsent={setTermsConsent}
                  privacyConsent={privacyConsent}
                  setPrivacyConsent={setPrivacyConsent}
                  emailConsent={emailConsent}
                  setEmailConsent={setEmailConsent}
                  error={error}
                  setError={setError}
                  setModalType={setModalType}
                  setIsSequentialAll={setIsSequentialAll}
                />

                <Button
                  disabled={loading || success || hasErrors || !termsConsent || !privacyConsent}
                  className="w-100 mb-2 custom-btn d-flex align-items-center justify-content-center"
                  type="submit"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" className="me-2" role="status" aria-hidden="true" />
                      가입 진행 중...
                    </>
                  ) : "가입하기"}
                </Button>
              </Form>

              <div className="auth-footer">
                이미 계정이 있으신가요? <Link to="/login" className="auth-link ms-1">로그인</Link>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>

      {/* 약관 및 개인정보 확인/동의 모달 */}
      <TermsModal
        show={modalType !== null}
        type={modalType}
        agreed={
          modalType === 'terms' ? termsConsent :
          modalType === 'consent' ? privacyConsent : false
        }
        onHide={() => {
          setModalType(null);
          setIsSequentialAll(false);
        }}
        onAgree={() => {
          if (modalType === 'terms') {
            setTermsConsent(true);
            if (isSequentialAll && !privacyConsent) {
              setTimeout(() => setModalType('consent'), 150);
              return;
            }
            if (isSequentialAll) {
              setEmailConsent(true);
            }
          } else if (modalType === 'consent') {
            setPrivacyConsent(true);
            if (isSequentialAll) {
              setEmailConsent(true);
              setIsSequentialAll(false);
            }
          }
          setModalType(null);
        }}
      />
    </div>
  );
};

export default Signup;
