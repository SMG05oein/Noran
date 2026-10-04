import { Modal, Button } from 'react-bootstrap';
import { RiCheckLine, RiCloseLine } from 'react-icons/ri';
import PrivacyPolicyContent from './PrivacyPolicyContent';
import SystemUsagePolicyContent from './SystemUsagePolicyContent';
import ConsentPolicyContent from './ConsentPolicyContent';

const TermsModal = ({ show, onHide, type, onAgree, agreed = false }) => {
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
        {onAgree && type !== 'privacy' && (
          <Button
            variant={agreed ? "success" : "primary"}
            onClick={() => {
              onAgree();
              onHide();
            }}
            className="fw-bold rounded-3 px-4 d-flex align-items-center gap-1"
          >
            <RiCheckLine size={18} />
            {agreed ? '이미 동의함 (확인)' : '확인 및 동의'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default TermsModal;
