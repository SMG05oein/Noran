import { Modal, Button } from 'react-bootstrap';
import { RiCheckLine, RiCloseLine } from 'react-icons/ri';
import PrivacyPolicyContent from './PrivacyPolicyContent';
import SystemUsagePolicyContent from './SystemUsagePolicyContent';
import ConsentPolicyContent from './ConsentPolicyContent';
import useAuthStore from '../store/useAuthStore';
import { updateTermsConsent } from '../api/authApi';

const TermsModal = ({ show, onHide, type, onAgree, agreed = false }) => {
  const { user } = useAuthStore();
  
  // type: 'terms' | 'consent' | 'privacy'
  let title = '';
  let content = null;

  if (type === 'terms') {
    title = '근태관리시스템 이용규정';
    content = <SystemUsagePolicyContent />;
  } else if (type === 'consent') {
    title = '개인정보 수집 및 이용 동의';
    content = <ConsentPolicyContent />;
  } else if (type === 'privacy') {
    title = '개인정보처리방침 전문';
    content = <PrivacyPolicyContent />;
  }

  const handleAgree = async () => {
    // 이미 동의한 상태라면 API 중복 호출 없이 닫기
    if (agreed) {
      if (onAgree) onAgree();
      onHide();
      return;
    }

    if (user) {
      // 로그인된 사용자면 API를 통해 재동의 처리
      let apiType = type;
      if (type === 'consent') apiType = 'collection'; // DB/API 규격에 맞게 매핑

      const res = await updateTermsConsent(apiType);
      if (res.success) {
        if (onAgree) onAgree();
        onHide();
      } else {
        alert(res.error || '약관 동의 처리에 실패했습니다.');
      }
    } else {
      // 비로그인 상태 (회원가입 중 등)
      if (onAgree) onAgree();
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {content}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="secondary" onClick={onHide} className="rounded-3 px-3">
          <RiCloseLine size={16} /> 닫기
        </Button>
        {onAgree && (
          <Button
            variant={agreed ? "success" : "primary"}
            onClick={handleAgree}
            className="fw-bold rounded-3 px-4 d-flex align-items-center gap-1"
          >
            <RiCheckLine size={18} />
            {agreed ? '이미 동의함 (확인)' : '확인 및 동의 (재동의)'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default TermsModal;
