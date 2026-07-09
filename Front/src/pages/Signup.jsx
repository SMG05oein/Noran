import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authSignup, fetchWorkPlaces } from '../api/authApi';
import { Form, Button, Container, Card, Alert, Spinner } from 'react-bootstrap';
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

  // 아이디 — 영문+숫자만
  const handleUserIdChange = (e) => {
    const raw = e.target.value;
    const filtered = raw.replace(/[^A-Za-z0-9]/g, '');
    setUserId(filtered);
    if (raw !== filtered) {
      setUserIdError('아이디는 영문자와 숫자만 입력할 수 있습니다.');
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
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh", padding: "20px 0" }}>
        <div className="w-100" style={{ maxWidth: "450px" }}>
          <Card className="glass-card shadow-lg border-0 rounded-4">
            <Card.Body className="p-5">
              <h2 className="text-center mb-4 fw-bold auth-title">회원가입</h2>
              {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}
              {success && <Alert variant="success" className="rounded-3">{successMessage}</Alert>}
              <Form onSubmit={handleSignup}>

                {/* 이름 */}
                <Form.Group id="userName" className="mb-3">
                  <Form.Label className="fw-semibold">이름</Form.Label>
                  <Form.Control
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                    placeholder="홍길동"
                    className="custom-input"
                  />
                </Form.Group>

                {/* 아이디 */}
                <Form.Group id="userId" className="mb-3">
                  <Form.Label className="fw-semibold">아이디</Form.Label>
                  <Form.Control
                    type="text"
                    value={userId}
                    onChange={handleUserIdChange}
                    required
                    placeholder="사용할 아이디 (영문, 숫자만)"
                    className={`custom-input ${userIdError ? 'is-invalid' : ''}`}
                  />
                  {userIdError ? (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {userIdError}
                    </div>
                  ) : (
                    <Form.Text className="text-muted" style={{ fontSize: '0.82rem' }}>
                      영문자와 숫자만 입력 가능합니다.
                    </Form.Text>
                  )}
                </Form.Group>

                {/* 비밀번호 */}
                <Form.Group id="password" className="mb-3">
                  <Form.Label className="fw-semibold">비밀번호</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    placeholder="비밀번호"
                    className="custom-input"
                  />
                </Form.Group>

                {/* 비밀번호 확인 */}
                <Form.Group id="passwordConfirm" className="mb-3">
                  <Form.Label className="fw-semibold">비밀번호 확인</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordConfirm}
                    onChange={handlePasswordConfirmChange}
                    required
                    placeholder="비밀번호 확인"
                    className={`custom-input ${pwMatchError ? 'is-invalid' : passwordConfirm && !pwMatchError ? 'is-valid' : ''}`}
                  />
                  {pwMatchError && (
                    <div className="invalid-feedback d-block" style={{ fontSize: '0.82rem' }}>
                      ⚠️ {pwMatchError}
                    </div>
                  )}
                  {!pwMatchError && passwordConfirm && (
                    <div className="text-success" style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                      ✅ 비밀번호가 일치합니다.
                    </div>
                  )}
                </Form.Group>

                {/* 전화번호 */}
                <Form.Group id="phone" className="mb-3">
                  <Form.Label className="fw-semibold">전화번호</Form.Label>
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
                    <div className="text-success" style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                      ✅ 올바른 전화번호 형식입니다.
                    </div>
                  )}
                </Form.Group>

                {/* 소속 지점 */}
                <Form.Group id="branch" className="mb-4">
                  <Form.Label className="fw-semibold">소속 지점</Form.Label>
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

                <Button
                  disabled={loading || success || hasErrors}
                  className="w-100 mb-3 custom-btn"
                  type="submit"
                  size="lg"
                >
                  {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : "가입하기"}
                </Button>
              </Form>
              <div className="w-100 text-center mt-3 text-muted">
                이미 계정이 있으신가요? <Link to="/login" className="text-decoration-none fw-bold auth-link">로그인</Link>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default Signup;
