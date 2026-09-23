import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authSignup, fetchWorkPlaces, fetchBanks } from '../api/authApi';
import { Form, Button, Container, Card, Alert, Spinner, Modal } from 'react-bootstrap';
import { RiUser3Line, RiLockPasswordLine, RiPhoneLine, RiStore2Line, RiRestaurantLine } from 'react-icons/ri';
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
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [termsConsent, setTermsConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);

  const [userIdError, setUserIdError] = useState('');
  const [pwMatchError, setPwMatchError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneWarn, setPhoneWarn] = useState('');
  const [userNameError, setUserNameError] = useState('');
  const [userEmailError, setUserEmailError] = useState('');
  const [birthError, setBirthError] = useState('');

  const [banks, setBanks] = useState([]);

  // 지점 목록
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
      return alert('아이디 입력 형식을 확인해주세요.');
    }
    if (pwMatchError || password !== passwordConfirm) {
      pwConfirmRef.current?.focus();
      return alert('비밀번호가 일치하지 않습니다.');
    }
    if (phoneError || !/^\d{3}-\d{3,4}-\d{4}$/.test(phone)) {
      phoneRef.current?.focus();
      return alert('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
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
        alert(response.error || '회원가입에 실패했습니다.');
        setError(response.error || '회원가입에 실패했습니다.');
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
                {/* 이름 */}
                <Form.Group id="userName" className="mb-3">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiUser3Line /> 이름
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={userName}
                    onChange={handleUserNameChange}
                    required
                    ref={userNameRef}
                    placeholder="성명을 입력하세요"
                    className={`custom-input ${userNameError ? 'is-invalid' : ''}`}
                  />
                  {userNameError && (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {userNameError}
                    </div>
                  )}
                </Form.Group>

                  {/* 생년월일 */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold text-muted small">생년월일 <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      value={birthDate}
                      onChange={handleBirthChange}
                      required
                      ref={birthRef}
                      className="custom-input"
                    />
                    {birthError && <div className="text-danger small mt-1">{birthError}</div>}
                  </Form.Group>

                  {/* 아이디 */}
                <Form.Group id="userId" className="mb-3">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiUser3Line /> 아이디
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={userId}
                    onChange={handleUserIdChange}
                    required
                    ref={userIdRef}
                    placeholder="영문, 숫자 조합"
                    className={`custom-input ${userIdError ? 'is-invalid' : ''}`}
                  />
                  {userIdError && (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {userIdError}
                    </div>
                  )}
                </Form.Group>

                {/* 이메일 (선택) */}
                <Form.Group id="userEmail" className="mb-3">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    이메일 (선택)
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={userEmail}
                    onChange={handleUserEmailChange}
                    ref={emailRef}
                    placeholder="이메일을 입력하세요 (선택)"
                    className={`custom-input ${userEmailError ? 'is-invalid' : ''}`}
                  />
                  {userEmailError && (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {userEmailError}
                    </div>
                  )}
                </Form.Group>

                {/* 비밀번호 */}
                <Form.Group id="password" className="mb-3">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiLockPasswordLine /> 비밀번호
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    placeholder="비밀번호 입력"
                    className="custom-input"
                  />
                </Form.Group>

                {/* 비밀번호 확인 */}
                <Form.Group id="passwordConfirm" className="mb-3">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiLockPasswordLine /> 비밀번호 확인
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordConfirm}
                    onChange={handlePasswordConfirmChange}
                    required
                    ref={pwConfirmRef}
                    placeholder="비밀번호를 다시 입력하세요"
                    className={`custom-input ${pwMatchError ? 'is-invalid' : ''}`}
                  />
                  {pwMatchError && (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {pwMatchError}
                    </div>
                  )}
                  {!pwMatchError && passwordConfirm && (
                    <div className="text-success" style={{ fontSize: '0.82rem', marginTop: '4px', fontWeight: '600' }}>
                      ✅ 비밀번호가 일치합니다.
                    </div>
                  )}
                </Form.Group>

                {/* 전화번호 */}
                <Form.Group id="phone" className="mb-3">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiPhoneLine /> 연락처
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    required
                    placeholder="010-0000-0000"
                    className={`custom-input ${phoneError || phoneWarn ? 'is-invalid' : phone && !phoneError && !phoneWarn ? 'is-valid' : ''}`}
                    maxLength={13}
                  />
                  {(phoneError || phoneWarn) ? (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {phoneWarn || phoneError}
                    </div>
                  ) : phone && (
                    <div className="text-success" style={{ fontSize: '0.82rem', marginTop: '4px', fontWeight: '600' }}>
                      ✅ 올바른 전화번호 형식입니다.
                    </div>
                  )}
                </Form.Group>

                <Form.Group id="userBank" className="mb-3">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiStore2Line /> 은행명
                  </Form.Label>
                  <Form.Select 
                    value={userBank} 
                    onChange={(e) => setUserBank(e.target.value)} 
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

                <Form.Group id="userAccountNumber" className="mb-3">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiStore2Line /> 계좌번호
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={userAccountNumber}
                    onChange={(e) => setUserAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                    ref={accountNumRef}
                    placeholder="계좌번호 (숫자와 하이픈만)"
                    className="custom-input"
                  />
                </Form.Group>

                <Form.Group id="userAccountName" className="mb-4">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiStore2Line /> 예금주 성명
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={userAccountName}
                    onChange={(e) => setUserAccountName(e.target.value)}
                    ref={accountNameRef}
                    placeholder="예금주 (본인 명의)"
                    className="custom-input"
                  />
                </Form.Group>

                {/* 소속 지점 */}
                <Form.Group id="branch" className="mb-4">
                  <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                    <RiStore2Line /> 소속 지점
                  </Form.Label>
                  <Form.Select
                    value={branch}
                    onChange={(e) => setBranch(Number(e.target.value))}
                    className="custom-input"
                  >
                    {branches.map(b => (
                      <option key={b.wpIdx} value={b.wpIdx}>
                        {b.wpName}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* 약관 동의 */}
                <div className="mb-4 p-3 rounded-3 border" style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-border)' }}>
                  <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <Form.Check
                      type="checkbox"
                      id="allConsent"
                      checked={termsConsent && privacyConsent && emailConsent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTermsConsent(checked);
                        setPrivacyConsent(checked);
                        setEmailConsent(checked);
                        if (error === '필수 규정에 모두 동의해야 회원가입이 가능합니다.') setError('');
                      }}
                      className="me-2"
                    />
                    <Form.Label htmlFor="allConsent" className="fw-bold mb-0" style={{ cursor: 'pointer', color: 'var(--color-text-main)' }}>
                      전체 동의합니다.
                    </Form.Label>
                  </div>
                  
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center">
                        <Form.Check
                          type="checkbox"
                          id="termsConsent"
                          checked={termsConsent}
                          onChange={(e) => {
                            setTermsConsent(e.target.checked);
                            if (error === '필수 규정에 모두 동의해야 회원가입이 가능합니다.') setError('');
                          }}
                          className="me-2"
                        />
                        <Form.Label htmlFor="termsConsent" className="mb-0 small" style={{ cursor: 'pointer', color: 'var(--color-text-main)' }}>
                          [필수] 근태관리시스템 이용규정 동의
                        </Form.Label>
                      </div>
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-muted small text-decoration-none">[전체 보기]</a>
                    </div>
                    <div className="border rounded p-2 small text-muted" style={{ height: '80px', overflowY: 'auto', fontSize: '0.75rem', background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      <strong>근태관리시스템 이용규정</strong><br/>
                      본 규정은 '노란돼지'가 소속 직원의 근태관리 업무 처리를 위해 도입한 내부 업무도구(전자적 근태관리시스템)의 이용 방법과 직원의 준수사항을 안내함을 목적으로 합니다.<br/>
                      (이용규정 전문은 [전체 보기]를 통해 확인하실 수 있습니다.)
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center">
                        <Form.Check
                          type="checkbox"
                          id="privacyConsent"
                          checked={privacyConsent}
                          onChange={(e) => {
                            setPrivacyConsent(e.target.checked);
                            if (error === '필수 규정에 모두 동의해야 회원가입이 가능합니다.') setError('');
                          }}
                          className="me-2"
                        />
                        <Form.Label htmlFor="privacyConsent" className="mb-0 small" style={{ cursor: 'pointer', color: 'var(--color-text-main)' }}>
                          [필수] 개인정보 수집 및 이용 동의
                        </Form.Label>
                      </div>
                      <a href="/consent" target="_blank" rel="noopener noreferrer" className="text-muted small text-decoration-none">[전체 보기]</a>
                    </div>
                    <div className="border rounded p-2 small text-muted" style={{ height: '90px', overflowY: 'auto', fontSize: '0.75rem', background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      <strong>개인정보 수집 및 이용 동의</strong><br/>
                      1. 수집 항목: 이름, 아이디, 비밀번호(접근제어용), 생년월일, 휴대전화번호, 소속 지점, 은행명, 계좌번호, 예금주 등<br/>
                      2. 수집 목적: 서비스 회원가입 및 관리, 근태관리 및 근무 스케줄 배정, 급여 지급 및 정산<br/>
                      3. 보유 및 이용기간: 회원 탈퇴 후 1년 보관 (단, 근태/급여 관련 정보는 근로기준법 등에 따라 3년, 세무 증빙자료는 최대 5년 보존)<br/>
                      * 귀하는 동의를 거부할 권리가 있으나, 거부 시 회원가입 및 서비스 이용이 제한됩니다.
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <Form.Check
                        type="checkbox"
                        id="emailConsent"
                        checked={emailConsent}
                        onChange={(e) => setEmailConsent(e.target.checked)}
                        className="me-2"
                      />
                      <Form.Label htmlFor="emailConsent" className="mb-0 small" style={{ cursor: 'pointer', color: 'var(--color-text-main)' }}>
                        [선택] 이메일 등 주요 공지사항 수신 동의
                      </Form.Label>
                    </div>
                  </div>
                  <div className="mt-2 text-end">
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary fw-bold small text-decoration-none">※ 개인정보처리방침 전문 보기</a>
                  </div>
                </div>

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
    </div>
  );
};

export default Signup;
