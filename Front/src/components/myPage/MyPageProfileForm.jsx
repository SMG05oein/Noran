import React from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { RiEdit2Line, RiLockPasswordLine, RiBankCardLine } from 'react-icons/ri';

const MyPageProfileForm = ({
  userInfo,
  userName,
  handleUserNameChange,
  userNameError,
  userNameRef,
  userBirth,
  handleBirthChange,
  birthError,
  birthRef,
  userPhone,
  handlePhoneChange,
  phoneWarn,
  phoneError,
  phoneRef,
  userEmail,
  handleUserEmailChange,
  userEmailError,
  emailRef,
  emailConsentAgreed,
  setEmailConsentAgreed,
  fkWorkPlaceIdx,
  setFkWorkPlaceIdx,
  branches,
  userBank,
  setUserBank,
  bankRef,
  banks,
  userAccountName,
  setUserAccountName,
  accountNameRef,
  userAccountNumber,
  setUserAccountNumber,
  accountNumRef,
  accountDetails,
  accountLoading,
  handleRevealAccount,
  saving,
  onSubmit,
  onOpenPwModal,
}) => {
  return (
    <Card className="border-0 shadow-sm rounded-4 mb-4">
      <Card.Body className="p-4">
        <div className="fw-bold text-muted small mb-3 d-flex align-items-center gap-1">
          <RiEdit2Line className="text-primary" /> 계정, 연락처, 급여 정보 관리
        </div>
        {userInfo?.userIsActive === 0 && (
          <Alert variant="danger" className="py-2 small fw-bold">퇴사자의 정보는 보호를 위해 수정할 수 없습니다.</Alert>
        )}
        <Form onSubmit={onSubmit}>
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
              <Button variant="outline-secondary" className="fw-bold py-2 px-3 rounded-3" onClick={onOpenPwModal} type="button">
                <RiLockPasswordLine className="me-1" /> 비밀번호 변경
              </Button>
            </div>
          </fieldset>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default MyPageProfileForm;

