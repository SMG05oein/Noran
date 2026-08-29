import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authSignup, fetchWorkPlaces } from '../api/authApi';
import { Form, Button, Container, Card, Alert, Spinner, Modal } from 'react-bootstrap';
import { RiUser3Line, RiLockPasswordLine, RiPhoneLine, RiStore2Line, RiRestaurantLine } from 'react-icons/ri';
import './Auth.css';

const Signup = () => {
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // 실시간 유효성 상태
  const [userIdError, setUserIdError] = useState('');
  const [pwMatchError, setPwMatchError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // 지점 목록
  const [branches, setBranches] = useState([]);

  const navigate = useNavigate();

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
    loadWorkPlaces();
  }, []);

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
    const val = e.target.value.replace(/[^0-9]/g, '');
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

  const hasErrors = !!userIdError || !!pwMatchError || !!phoneError;

  const handleSignup = async (e) => {
    e.preventDefault();

    // 제출 시 최종 검증
    if (!consent) {
      return setError('개인정보 수집 및 이용에 동의해야 회원가입이 가능합니다.');
    }

    if (password !== passwordConfirm) {
      return setError('비밀번호가 일치하지 않습니다.');
    }
    if (!/^\d{3}-\d{3,4}-\d{4}$/.test(phone)) {
      return setError('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
    }
    if (hasErrors) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        userId,
        userPw: password,
        userName,
        userPhone: phone,
        fkUtIdx: 1,
        fkWorkPlaceIdx: parseInt(branch),
      };

      const response = await authSignup(payload);
      if (response.success) {
        setSuccess(true);
        setSuccessMessage(
          typeof response.data === 'string'
            ? response.data
            : response.data?.msg || '회원가입 성공! 로그인 페이지로 이동합니다.'
        );
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(response.error || '회원가입에 실패했습니다.');
      }
    } catch (err) {
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
                    onChange={(e) => setUserName(e.target.value)}
                    required
                    placeholder="성명을 입력하세요"
                    className="custom-input"
                  />
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
                    placeholder="사용할 아이디"
                    className={`custom-input ${userIdError ? 'is-invalid' : ''}`}
                  />
                  {userIdError && (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {userIdError}
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
                    placeholder="비밀번호 재입력"
                    className={`custom-input ${pwMatchError ? 'is-invalid' : passwordConfirm && !pwMatchError ? 'is-valid' : ''}`}
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
                    className={`custom-input ${phoneError ? 'is-invalid' : phone && !phoneError ? 'is-valid' : ''}`}
                    maxLength={13}
                  />
                  {phoneError ? (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {phoneError}
                    </div>
                  ) : phone && (
                    <div className="text-success" style={{ fontSize: '0.82rem', marginTop: '4px', fontWeight: '600' }}>
                      ✅ 올바른 전화번호 형식입니다.
                    </div>
                  )}
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

                {/* 개인정보 수집 및 이용 동의 */}
                <Form.Group className="mb-4 d-flex align-items-start gap-2 p-3 bg-light rounded-3 border">
                  <Form.Check
                    type="checkbox"
                    id="privacyConsent"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (error === '개인정보 수집 및 이용에 동의해야 회원가입이 가능합니다.') setError('');
                    }}
                    className="mt-1"
                  />
                  <div>
                    <Form.Label htmlFor="privacyConsent" className="fw-bold text-dark mb-1" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                      [필수] 개인정보 수집 및 이용 동의
                    </Form.Label>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      원활한 서비스 이용을 위해 이름, 연락처, 이메일을 수집합니다.{' '}
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-bold"
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => setShowConsentModal(true)}
                      >
                        자세히 보기
                      </button>
                    </div>
                  </div>
                </Form.Group>

                <Button
                  disabled={loading || success || hasErrors || !consent}
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

      {/* 약관 모달 */}
      <Modal show={showConsentModal} onHide={() => setShowConsentModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5">개인정보 수집 및 이용 동의</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 text-dark">
          <p className="small mb-3">원활한 서비스 이용을 위해 아래와 같이 개인정보를 수집 및 이용합니다.</p>
          <div className="bg-light p-3 rounded-3 border small">
            <h6 className="fw-bold mb-1">1. 수집하는 개인정보 항목</h6>
            <p className="mb-3 text-muted">필수항목: 이름, 아이디, 비밀번호, 전화번호, 소속 지점<br />선택항목: 이메일</p>

            <h6 className="fw-bold mb-1">2. 수집 및 이용 목적</h6>
            <p className="mb-3 text-muted">서비스 회원가입 및 관리, 주간 근무 스케줄 배정 및 관리, 본인 식별, 원활한 의사소통 경로 확보</p>

            <h6 className="fw-bold mb-1">3. 보유 및 이용 기간</h6>
            <p className="mb-3 text-muted fw-bold">근로 계약 종료 시까지 이용하며, 관계 법령(소득세법, 근로기준법)에 의거 보존할 필요가 있는 경우 해당 기간 동안 보존합니다.</p>

            <h6 className="fw-bold mb-1">4. 동의 거부권 및 불이익</h6>
            <p className="mb-0 text-muted">귀하는 개인정보 수집에 동의를 거부할 권리가 있습니다. 단, 필수항목 수집 동의 거부 시 회원가입 및 서비스 이용이 제한됩니다.</p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="primary" className="w-100 fw-bold rounded-pill" onClick={() => {
            setConsent(true);
            setShowConsentModal(false);
          }}>
            동의합니다
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Signup;
