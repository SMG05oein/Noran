import React from 'react';
import { Container, Card, Button, Badge, Spinner } from 'react-bootstrap';

const MaintenanceOverlay = ({ onRecheck, checking }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#181825',
        color: '#fff',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <Container style={{ maxWidth: '520px' }}>
        <Card
          className="shadow-lg border-0 rounded-4 text-center overflow-hidden"
          style={{ backgroundColor: '#2b2b40', color: '#fff', borderTop: '6px solid #ff4d4f' }}
        >
          <Card.Body className="p-4 p-md-5">
            <div className="mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: '80px', height: '80px', backgroundColor: '#3d1a24', color: '#ff4d4f' }}
              >
                <i className="bi bi-tools fs-1"></i>
              </div>
              <div>
                <Badge bg="danger" className="px-3 py-2 fs-6 rounded-pill mb-2">
                  🚨 시스템 긴급 점검 진행 중
                </Badge>
              </div>
            </div>

            <h3 className="fw-bold mb-3" style={{ color: '#fff' }}>
              서비스 이용 일시 중단 안내
            </h3>

            <p className="text-secondary leading-relaxed mb-4" style={{ fontSize: '0.95rem' }}>
              현재 시스템 성능 향상 및 신규 기능 반영을 위한 긴급 점검 작업이 진행되고 있습니다.<br />
              점검이 완료되는 대로 더욱 안정적인 서비스로 돌아오겠습니다.
            </p>

            <div
              className="p-3 rounded-3 mb-4 text-start small"
              style={{ backgroundColor: '#1e1e2d', border: '1px solid #3f3f5a' }}
            >
              <div className="d-flex justify-content-between mb-1">
                <span className="text-white">점검 대상:</span>
                <span className="fw-semibold text-info">근무관리 전 기능</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-white">상태:</span>
                <span className="fw-semibold text-danger">접근 제한 중</span>
              </div>
            </div>

            <Button
              variant="outline-info"
              size="lg"
              className="w-100 fw-bold rounded-pill shadow-sm"
              onClick={onRecheck}
              disabled={checking}
            >
              {checking ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  점검 상태 확인 중...
                </>
              ) : (
                '🔄 점검 상태 재확인 (새로고침)'
              )}
            </Button>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default MaintenanceOverlay;
