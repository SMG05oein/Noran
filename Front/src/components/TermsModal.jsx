import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { RiCheckLine, RiCloseLine, RiFileTextLine } from 'react-icons/ri';
import PrivacyPolicyContent from './PrivacyPolicyContent';
import SystemUsagePolicyContent from './SystemUsagePolicyContent';
import ConsentPolicyContent from './ConsentPolicyContent';
import ConsentChangeSummary from './ConsentChangeSummary';
import useAuthStore from '../store/useAuthStore';
import { updateTermsConsent } from '../api/authApi';

const TermsModal = ({
  show,
  onHide,
  type,
  onAgree,
  agreed = false,
  forceReconsent = false,
}) => {
  const { user } = useAuthStore();
  const [showFull, setShowFull] = useState(!forceReconsent);

  let title = '';
  let fullContent = null;

  if (type === 'terms') {
    title = forceReconsent ? '이용규정 재동의' : '근태관리시스템 이용규정';
    fullContent = <SystemUsagePolicyContent />;
  } else if (type === 'consent') {
    title = forceReconsent ? '수집·이용 동의 재동의' : '개인정보 수집·이용 및 국외 이전 동의';
    fullContent = <ConsentPolicyContent />;
  } else if (type === 'privacy') {
    title = forceReconsent ? '개인정보처리방침 재동의' : '개인정보처리방침 전문';
    fullContent = <PrivacyPolicyContent />;
  }

  const handleCloseAttempt = () => {
    if (forceReconsent) {
      window.alert(
        '약관 재동의는 필수입니다.\n닫으셔도 서비스를 계속 이용하려면 동의가 필요합니다.'
      );
      return;
    }
    onHide?.();
  };

  const handleAgree = async () => {
    if (agreed) {
      if (onAgree) onAgree();
      onHide?.();
      return;
    }

    if (user) {
      let apiType = type;
      if (type === 'consent') apiType = 'collection';

      const res = await updateTermsConsent(apiType);
      if (res.success) {
        if (onAgree) await onAgree();
        onHide?.();
      } else {
        alert(res.error || '약관 동의 처리에 실패했습니다.');
      }
    } else {
      if (onAgree) onAgree();
      onHide?.();
    }
  };

  return (
    <Modal show={show} onHide={handleCloseAttempt} centered size="lg" backdrop={forceReconsent ? 'static' : true}>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {forceReconsent && (
          <div className="mb-3">
            <ConsentChangeSummary type={type} />
            <Button
              variant="link"
              className="px-0 mt-3 small fw-semibold d-inline-flex align-items-center gap-1"
              onClick={() => setShowFull((v) => !v)}
            >
              <RiFileTextLine size={16} />
              {showFull ? '전문 접기' : '전문 보기'}
            </Button>
          </div>
        )}
        {(!forceReconsent || showFull) && (
          <div className={forceReconsent ? 'pt-2 border-top' : undefined}>
            {fullContent}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="secondary" onClick={handleCloseAttempt} className="rounded-3 px-3">
          <RiCloseLine size={16} /> 닫기
        </Button>
        {onAgree && (
          <Button
            variant={agreed ? 'success' : 'primary'}
            onClick={handleAgree}
            className="fw-bold rounded-3 px-4 d-flex align-items-center gap-1"
          >
            <RiCheckLine size={18} />
            {agreed ? '이미 동의함 (확인)' : forceReconsent ? '확인 및 동의' : '확인 및 동의 (재동의)'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default TermsModal;
