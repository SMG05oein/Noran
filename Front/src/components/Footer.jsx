import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <>
      {/* 푸터 영역 (모바일에서는 숨김) */}
      <footer className="mt-auto py-4 bg-light border-top d-none d-lg-block" style={{ fontSize: '0.85rem' }}>
        <Container>
          <Row className="gy-3">
            <Col md={6} className="text-center text-md-start">
              <h6 className="fw-bold text-dark mb-2">노란돼지</h6>
              <div className="mb-2">
                <Link to="/privacy" className="text-decoration-none fw-bold text-dark">개인정보처리방침</Link>
                <span className="mx-2 text-muted">|</span>
                <Link to="/consent" className="text-decoration-none text-muted">개인정보 수집·이용 동의서</Link>
                <span className="mx-2 text-muted">|</span>
                <Link to="/terms" className="text-decoration-none text-muted">이용규정</Link>
              </div>
              <div className="text-muted mb-1">대표: 최재복</div>
              <div className="text-muted mb-1">주소: 서울 동작구 동작대로7길 97</div>
              {/* <div className="text-muted mb-1">시스템 기획 및 개발: 서민관</div> */}
              <div className="text-muted">대표 번호: 010-5833-9279</div>
            </Col>
            <Col md={6} className="d-flex flex-column align-items-center align-items-md-end justify-content-center">

              <div className="text-muted">
                <div className="text-muted mb-2">
                  <div>시스템 개선 문의 </div>
                  <div>010-2011-1392(카카오톡)</div>
                  010-3189-1392(문자, 카카오톡)<br/>
                  앱 버전: v1.0.0
                </div>
                &copy; {new Date().getFullYear()} MinGwan-Seo. All rights reserved.
              </div>
            </Col>
          </Row>
        </Container>
      </footer>

    </>
  );
};

export default Footer;