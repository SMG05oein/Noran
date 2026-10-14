import React from 'react';
import useAuthStore from '../store/useAuthStore';
import TermsModal from './TermsModal';

const GlobalConsentGuard = () => {
  const { isAuthenticated, user } = useAuthStore();

  // 로그인되지 않았거나 유저 정보가 없으면 렌더링 안 함
  if (!isAuthenticated || !user) return null;

  // 세 가지 약관 중 재동의가 필요한 첫 번째 항목을 찾음
  // 백엔드에서 user 객체 안에 이 boolean 값들을 줘야 함
  const needsPrivacy = user.needsPrivacyConsent;
  const needsCollection = user.needsCollectionConsent;
  const needsTerms = user.needsTermsConsent;

  // 띄워야 할 모달 타입 결정
  let modalType = null;
  if (needsPrivacy) modalType = 'privacy';
  else if (needsCollection) modalType = 'consent'; // 프론트엔드에서는 'consent'로 사용됨
  else if (needsTerms) modalType = 'terms';

  const handleAgree = () => {
    // 동의 처리가 완료되면 백엔드 DB가 업데이트됩니다.
    // 프론트엔드에서는 새로고침하여 /me API를 다시 호출해 user.needs*** 상태를 최신화합니다.
    window.location.reload();
  };

  // 띄울 모달이 있다면 (모달을 닫지 못하도록 강제함)
  if (modalType) {
    return (
      <TermsModal
        show={true}
        onHide={() => {
          // 강제 모달이므로 onHide 시 아무 동작도 하지 않아 모달이 닫히지 않게 함
        }}
        type={modalType}
        onAgree={handleAgree}
        agreed={false}
      />
    );
  }

  return null;
};

export default GlobalConsentGuard;
