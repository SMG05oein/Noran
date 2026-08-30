import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import TermsModal from './TermsModal';
import PrivacyModal from './PrivacyModal';

const Footer = () => {
  // 모달 상태 관리
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleCloseTerms = () => setShowTerms(false);
  const handleShowTerms = (e) => {
    e.preventDefault();
    setShowTerms(true);
  };

  const handleClosePrivacy = () => setShowPrivacy(false);
  const handleShowPrivacy = (e) => {
    e.preventDefault();
    setShowPrivacy(true);
  };

  return (
    <>
      {/* 푸터 영역 */}
      <footer className="mt-auto py-4 bg-light border-top d-none d-lg-block" style={{ fontSize: '0.85rem' }}>
        <Container>
          <Row className="gy-3">
            <Col md={6} className="text-center text-md-start">
              <h6 className="fw-bold text-dark mb-2">노란돼지</h6>
              <div className="text-muted mb-1">대표: 최재복</div>
              <div className="text-muted">주소: 서울 동작구 동작대로7길 97</div>
              {/* <div className="text-muted mb-1">시스템 기획 및 개발: 서민관</div> */}
              <div className="text-muted">대표 번호: 010-5833-9279</div>
              <div className="text-muted">시스템 개선 문의: 010-2011-1392(카카오톡 문의만) </div>
            </Col>
            <Col md={6} className="d-flex flex-column align-items-center align-items-md-end justify-content-center">
              <div className="d-flex gap-3 mb-2">
                <a
                  href="#terms"
                  onClick={handleShowTerms}
                  className="text-decoration-none text-muted fw-bold"
                >
                  이용약관
                </a>
                <a
                  href="#privacy"
                  onClick={handleShowPrivacy}
                  className="text-decoration-none text-muted fw-bold"
                >
                  개인정보처리방침
                </a>
              </div>
              <div className="text-muted">
                &copy; {new Date().getFullYear()} MinGwan-Seo. All rights reserved.
              </div>
            </Col>
          </Row>
        </Container>
      </footer>

      <TermsModal show={showTerms} onHide={handleCloseTerms} />
      <PrivacyModal show={showPrivacy} onHide={handleClosePrivacy} />
    </>
  );
};

export default Footer;