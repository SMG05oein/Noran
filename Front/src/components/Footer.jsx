import React, { useState } from 'react';
import { Container, Row, Col, Modal, Button } from 'react-bootstrap';

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
      <footer className="mt-auto py-4 bg-light border-top" style={{ fontSize: '0.85rem' }}>
        <Container>
          <Row className="gy-3">
            <Col md={6} className="text-center text-md-start">
              <h6 className="fw-bold text-dark mb-2">노란돼지 근태관리 시스템</h6>
              <div className="text-muted mb-1">대표: -</div>
              {/* <div className="text-muted mb-1">시스템 기획 및 개발: 서민관</div> */}
              <div className="text-muted">문의: - | 매장 번호: -</div>
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
                &copy; {new Date().getFullYear()} 노란돼지. All rights reserved.
              </div>
            </Col>
          </Row>
        </Container>
      </footer>

      {/* 이용약관 모달 */}
      <Modal show={showTerms} onHide={handleCloseTerms} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5">이용약관</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-muted" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          <h6 className="fw-bold text-dark">제1조 (목적)</h6>
          <p>본 약관은 노란(약산)돼지(이하 "매장")가 제공하는 근태 및 스케줄 관리 시스템(이하 "서비스")의 이용 조건 및 절차, 매장과 근로자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>

          <h6 className="fw-bold text-dark">제2조 (이용 대상)</h6>
          <p>본 서비스는 매장에 재직 중인 근로자(아르바이트 및 정직원)에 한하여 가입 및 이용이 가능하며, 퇴사 시 서비스 이용이 제한되거나 계정이 삭제될 수 있습니다.</p>

          <h6 className="fw-bold text-dark">제3조 (회원의 의무 및 계정 관리)</h6>
          <p>
            1. 회원은 출퇴근 기록 및 스케줄 관리를 위해 본 서비스를 이용할 수 있습니다.<br />
            2. 타인의 계정으로 대리 출퇴근을 기록하거나, 시스템을 조작하는 등 부정행위를 하여서는 안 됩니다.<br />
            3. 근무 시간 외 또는 승인되지 않은 시간에 출퇴근을 기록하는 등 근무 시간 조작을 시도해서는 안 됩니다.<br />
            4. 출퇴근 시간 및 근무 시간, 급여 산정에 포함되는 각종 수당 및 차감되는 항목에 대하여는 매장의 판단을 존중하며, 매장이 정한 기준에 따라 급여가 산정되는 것에 동의합니다.<br />
            5. 출퇴근, 근무 관리 이외의 조작으로 서비스에 오류를 발생시켜 업무에 지장을 주어서는 안 됩니다.<br />
            6. 아이디와 비밀번호에 대한 관리 책임은 회원 본인에게 있으며, 이를 타인에게 양도하거나 공유할 수 없습니다.
          </p>

          <h6 className="fw-bold text-dark">제4조 (서비스의 제공 및 변경)</h6>
          <p>
            1. 매장은 주간 근무 스케줄 배정, 출퇴근 기록, 급여 정산 기초 자료 제공 등의 서비스를 제공합니다.<br />
            2. 매장의 사정이나 시스템 유지보수 등에 따라 서비스의 일부 또는 전부가 변경되거나 일시 중단될 수 있습니다.
          </p>

          <h6 className="fw-bold text-dark">제5조 (기타)</h6>
          <p className="mb-0">본 약관에 명시되지 않은 사항은 근로기준법 등 관계 법령 및 매장의 취업규칙(또는 근로계약서)에 따릅니다.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseTerms}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 개인정보처리방침 모달 */}
      <Modal show={showPrivacy} onHide={handleClosePrivacy} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5">개인정보처리방침</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-muted" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          <h6 className="fw-bold text-dark">1. 수집하는 개인정보 항목</h6>
          <p>
            - 필수항목(회원가입): 이름, 아이디, 비밀번호, 전화번호, 소속 지점<br />
            - 필수항목(급여정산): 은행명, 예금주, 계좌번호<br />
            - 선택항목: 이메일
          </p>

          <h6 className="fw-bold text-dark">2. 개인정보의 수집 및 이용 목적</h6>
          <p>수집된 개인정보는 다음의 목적을 위해서만 활용됩니다.<br />
            - 서비스 회원 가입 및 관리, 본인 식별<br />
            - 주간 근무 스케줄 배정 및 근태 관리<br />
            - 원활한 의사소통 경로 확보 및 공지사항 전달<br />
            - 급여 정산, 계좌 이체 및 세무 신고를 위한 기초 자료 활용
          </p>

          <h6 className="fw-bold text-dark">3. 개인정보의 처리 위탁</h6>
          <p>매장은 원활한 급여 정산 및 세무 처리 업무를 위해 아래와 같이 개인정보 처리 업무를 외부 전문 업체에 위탁하고 있습니다.<br />
            - 수탁자(위탁받는 자): -<br />
            - 위탁하는 업무의 내용: 급여 정산, 4대 보험 신고 및 관련 세무 처리
          </p>

          <h6 className="fw-bold text-dark">4. 개인정보의 보유 및 이용 기간</h6>
          <p>원칙적으로 근로 계약 종료 시까지 개인정보를 보유 및 이용합니다. 단, 관계 법령에 의거하여 보존할 필요가 있는 경우 아래와 같이 법령에서 정한 기간 동안 보관합니다.<br />
            - 근로계약서, 임금대장 등 근로계약에 관한 중요 서류: 3년 (근로기준법)<br />
            - 소득세 등 세무 증빙 관련 서류: 5년 (국세기본법)
          </p>

          <h6 className="fw-bold text-dark">5. 개인정보보호책임자</h6>
          <p className="mb-0">서비스 이용 중 발생하는 모든 개인정보보호 관련 민원은 아래의 연락처로 문의하실 수 있습니다.<br />
            - 개인정보보호책임자: -<br />
            - 연락처: -
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClosePrivacy}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Footer;