import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import SystemUsagePolicyContent from '../components/SystemUsagePolicyContent';

const SystemUsagePolicy = () => {
  const navigate = useNavigate();
  return (
    <Container className="py-5" style={{ maxWidth: '800px' }}>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4 p-md-5">
          <h2 className="fw-bold mb-4 text-center">근태관리시스템 이용규정</h2>
          <SystemUsagePolicyContent />

          <div className="text-center mt-5">
            <Button variant="secondary" onClick={() => navigate(-1)} className="px-4 fw-bold">
              이전
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SystemUsagePolicy;
