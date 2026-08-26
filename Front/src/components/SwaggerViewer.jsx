import React, { useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';

const SwaggerViewer = () => {
  const [showIframe, setShowIframe] = useState(true);
  const backendTarget = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const swaggerUrl = `${backendTarget}/swagger-ui/index.html`;

  return (
    <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
      <Card.Header className="d-flex justify-content-between align-items-center" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
        <span className="fw-bold">API 명세서 (Swagger UI)</span>
        <div>
          <Button
            variant="outline-info"
            size="sm"
            className="me-2"
            onClick={() => setShowIframe(!showIframe)}
          >
            {showIframe ? '임베드 닫기' : '임베드 열기'}
          </Button>
          <Button
            variant="info"
            size="sm"
            className="fw-bold"
            onClick={() => window.open(swaggerUrl, '_blank')}
          >
            새 창에서 Swagger 열기 ↗
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-3">
        <Alert variant="info" className="py-2 mb-3 small d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-info-circle-fill me-2"></i>
            백엔드 Swagger UI 주소: <code className="text-dark">{swaggerUrl}</code>
          </span>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-decoration-none fw-bold text-info"
            onClick={() => window.open(swaggerUrl, '_blank')}
          >
            새 창으로 열기 ↗
          </Button>
        </Alert>

        {showIframe ? (
          <div style={{ width: '100%', height: '700px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
            <iframe
              src="/swagger-ui/index.html"
              title="Swagger UI"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </div>
        ) : (
          <div className="text-center py-5 text-muted">
            임베드 화면이 닫혀 있습니다. 상단의 버튼을 눌러 새 창에서 확인하거나 다시 임베드해 주세요.
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SwaggerViewer;
