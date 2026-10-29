import React from 'react';
import { Form } from 'react-bootstrap';
import {
  RiUser3Line,
  RiLockPasswordLine,
  RiPhoneLine,
  RiStore2Line,
} from 'react-icons/ri';

const SignupFormFields = ({
  userName,
  handleUserNameChange,
  userNameError,
  userNameRef,
  birthDate,
  handleBirthChange,
  birthError,
  birthRef,
  userId,
  handleUserIdChange,
  userIdError,
  userIdRef,
  userEmail,
  handleUserEmailChange,
  userEmailError,
  emailRef,
  password,
  handlePasswordChange,
  passwordConfirm,
  handlePasswordConfirmChange,
  pwMatchError,
  pwConfirmRef,
  phone,
  handlePhoneChange,
  phoneError,
  phoneWarn,
  phoneRef,
  userBank,
  setUserBank,
  bankRef,
  banks,
  userAccountNumber,
  setUserAccountNumber,
  accountNumRef,
  userAccountName,
  setUserAccountName,
  accountNameRef,
  branch,
  setBranch,
  branches,
}) => {
  return (
    <>
      {/* 이름 */}
      <Form.Group id="userName" className="mb-3">
        <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
          <RiUser3Line /> 이름 <span className="text-danger">*</span>
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
          <RiUser3Line /> 아이디 <span className="text-danger">*</span>
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
          <RiLockPasswordLine /> 비밀번호 <span className="text-danger">*</span>
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
          <RiLockPasswordLine /> 비밀번호 확인 <span className="text-danger">*</span>
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
          <RiPhoneLine /> 연락처 <span className="text-danger">*</span>
        </Form.Label>
        <Form.Control
          type="text"
          value={phone}
          onChange={handlePhoneChange}
          required
          ref={phoneRef}
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
          <RiStore2Line /> 은행명 <span className="text-danger">*</span>
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
          <RiStore2Line /> 계좌번호 <span className="text-danger">*</span>
        </Form.Label>
        <Form.Control
          type="text"
          value={userAccountNumber}
          onChange={(e) => setUserAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
          ref={accountNumRef}
          placeholder="계좌번호 입력"
          className="custom-input"
        />
      </Form.Group>

      <Form.Group id="userAccountName" className="mb-4">
        <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
          <RiStore2Line /> 예금주 성명 <span className="text-danger">*</span>
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
          <RiStore2Line /> 소속 지점 <span className="text-danger">*</span>
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
    </>
  );
};

export default SignupFormFields;

