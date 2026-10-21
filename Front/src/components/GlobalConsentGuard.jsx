import useAuthStore from '../store/useAuthStore';
import TermsModal from './TermsModal';
import { fetchMyInfo } from '../api/authApi';
import { agreedFieldForModalType, mapConsentFlags, needsReconsent } from '../utils/consentFlags';

const GlobalConsentGuard = () => {
  const { isAuthenticated, user, login } = useAuthStore();

  if (!isAuthenticated || !user) return null;

  // *ConsentAgreed === 0 만 재동의. 1이면 스킵. 관리자도 동일.
  const needsPrivacy = needsReconsent(user.privacyConsentAgreed);
  const needsCollection = needsReconsent(user.collectionConsentAgreed);
  const needsTerms = needsReconsent(user.termsConsentAgreed);

  let modalType = null;
  if (needsPrivacy) modalType = 'privacy';
  else if (needsCollection) modalType = 'consent';
  else if (needsTerms) modalType = 'terms';

  const afterAgree = async (agreedModalType) => {
    const field = agreedFieldForModalType(agreedModalType);
    const current = useAuthStore.getState().user;
    // PUT 직후 /me 지연 대비: 동의한 항목은 즉시 1로 올려 다음 팝업만 남김
    if (field && current) {
      login({ ...current, [field]: 1 });
    }

    const infoRes = await fetchMyInfo();
    if (infoRes.success && infoRes.data) {
      const latest = useAuthStore.getState().user;
      login({
        ...latest,
        ...mapConsentFlags(infoRes.data),
        isAdmin: infoRes.data.is_admin ?? infoRes.data.isAdmin ?? latest?.isAdmin,
      });
    }
  };

  if (modalType) {
    return (
      <TermsModal
        key={modalType}
        show={true}
        onHide={() => {}}
        type={modalType}
        onAgree={() => afterAgree(modalType)}
        agreed={false}
        forceReconsent
      />
    );
  }

  return null;
};

export default GlobalConsentGuard;
