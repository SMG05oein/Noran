import React from 'react';
import { Form } from 'react-bootstrap';

const SignupTermsSection = ({
  termsConsent,
  setTermsConsent,
  privacyConsent,
  setPrivacyConsent,
  emailConsent,
  setEmailConsent,
  error,
  setError,
  setModalType,
  setIsSequentialAll
}) => {
  return (
    <div className="mb-4 p-3 rounded-3 border" style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-border)' }}>
      <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
        <Form.Check
          type="checkbox"
          id="allConsent"
          checked={termsConsent && privacyConsent && emailConsent}
          onChange={(e) => {
            const checked = e.target.checked;
            if (checked) {
              if (!termsConsent) {
                setIsSequentialAll(true);
                setModalType('terms');
              } else if (!privacyConsent) {
                setIsSequentialAll(true);
                setModalType('consent');
              } else {
                setTermsConsent(true);
                setPrivacyConsent(true);
                setEmailConsent(true);
              }
            } else {
              setIsSequentialAll(false);
              setTermsConsent(false);
              setPrivacyConsent(false);
              setEmailConsent(false);
            }
            if (error === '필수 규정에 모두 동의해야 회원가입이 가능합니다.') setError('');
          }}
          className="me-2"
        />
        <Form.Label htmlFor="allConsent" className="fw-bold mb-0" style={{ cursor: 'pointer', color: 'var(--color-text-main)' }}>
          전체 동의합니다.
        </Form.Label>
      </div>

      {/* 이용규정 */}
      <div className="mb-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center">
            <Form.Check
              type="checkbox"
              id="termsConsent"
              checked={termsConsent}
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  setModalType('terms');
                } else {
                  setTermsConsent(false);
                }
                if (error === '필수 규정에 모두 동의해야 회원가입이 가능합니다.') setError('');
              }}
              className="me-2"
            />
            <span
              onClick={() => setModalType('terms')}
              className="mb-0 small fw-semibold"
              style={{ cursor: 'pointer', color: 'var(--color-text-main)' }}
            >
              [필수] 근태관리시스템 이용규정 동의 <span className="text-danger">*</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setModalType('terms')}
            className="btn btn-link p-0 text-muted small text-decoration-none"
          >
            [내용 보기]
          </button>
        </div>
        <div
          onClick={() => setModalType('terms')}
          className="border rounded p-2 small text-muted"
          style={{ cursor: 'pointer', height: '65px', overflowY: 'auto', fontSize: '0.75rem', background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <strong>근태관리시스템 이용규정</strong><br/>
          본 규정은 '노란돼지'가 소속 직원의 근태관리 업무 처리를 위해 도입한 내부 업무도구의 이용 방법과 직원의 준수사항을 안내함을 목적으로 합니다. (클릭하여 전문 확인 및 동의)
        </div>
      </div>

      {/* 개인정보 수집 및 이용 */}
      <div className="mb-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center">
            <Form.Check
              type="checkbox"
              id="privacyConsent"
              checked={privacyConsent}
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  setModalType('consent');
                } else {
                  setPrivacyConsent(false);
                }
                if (error === '필수 규정에 모두 동의해야 회원가입이 가능합니다.') setError('');
              }}
              className="me-2"
            />
            <span
              onClick={() => setModalType('consent')}
              className="mb-0 small fw-semibold"
              style={{ cursor: 'pointer', color: 'var(--color-text-main)' }}
            >
              [필수] 개인정보 수집·이용 및 국외 이전 동의 <span className="text-danger">*</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setModalType('consent')}
            className="btn btn-link p-0 text-muted small text-decoration-none"
          >
            [내용 보기]
          </button>
        </div>
        <div
          onClick={() => setModalType('consent')}
          className="border rounded p-2 small text-muted"
          style={{ cursor: 'pointer', height: '65px', overflowY: 'auto', fontSize: '0.75rem', background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <strong>개인정보 수집·이용 및 국외 이전 동의</strong><br/>
          1. 수집 항목: 이름, 아이디, 비밀번호, 생년월일, 연락처, 지점, 은행, 계좌 등<br/>
          2. 국외 이전: 일본(오사카) Oracle Cloud에 서비스 운영 목적 보관 (클릭하여 전문 확인 및 동의)
        </div>
      </div>

      {/* 선택 이메일 동의 */}
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
        <button
          type="button"
          onClick={() => setModalType('privacy')}
          className="btn btn-link p-0 text-primary fw-bold small text-decoration-none"
        >
          ※ 개인정보처리방침 전문 보기
        </button>
      </div>
    </div>
  );
};

export default SignupTermsSection;

