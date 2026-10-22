import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useDevAuthStore from '../store/useDevAuthStore';
import { devLogin } from '../api/devAuthApi';
import { promptDevIpOtp } from '../api/devIpToken';
import './DevConsole.css';

const DevLogin = () => {
  const [devId, setDevId] = useState('');
  const [devPw, setDevPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useDevAuthStore((state) => state.devLogin);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!devId.trim() || !devPw.trim()) return setError('아이디와 비밀번호를 입력해주세요.');

    setLoading(true);
    setError('');

    try {
      let response = await devLogin(devId, devPw);

      if (!response.success && response.code === 'DEV_IP_OTP_REQUIRED') {
        try {
          await promptDevIpOtp();
          response = await devLogin(devId, devPw);
        } catch {
          setError('IP 인증이 취소되었거나 완료되지 않았습니다.');
          return;
        }
      }

      if (response.success) {
        login({
          devId: response.data.devId,
          devName: response.data.devName,
          isTempPw: response.data.isTempPw,
          tokens: { accessToken: response.data.accessToken },
        });
        navigate('/dev/dashboard');
      } else {
        setError(response.error || '개발자 로그인에 실패했습니다.');
      }
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dev-console dc-login" data-bs-theme="dark">
      <div className="dc-login-card">
        <span className="dc-brand-kicker">노란돼지 · 운영</span>
        <h1>운영 콘솔 로그인</h1>
        <p className="dc-brand-sub">OCI 단일 서버 개발자 접속</p>

        {error && <div className="dc-alert dc-alert-bad">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="dc-field">
            <label htmlFor="dev-id">개발자 ID</label>
            <input
              id="dev-id"
              type="text"
              autoComplete="username"
              value={devId}
              onChange={(e) => setDevId(e.target.value)}
              required
            />
          </div>
          <div className="dc-field">
            <label htmlFor="dev-pw">비밀번호</label>
            <input
              id="dev-pw"
              type="password"
              autoComplete="current-password"
              value={devPw}
              onChange={(e) => setDevPw(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="dc-btn dc-btn-accent dc-login-submit" disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DevLogin;
