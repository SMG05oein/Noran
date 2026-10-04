import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import ConsentPolicyContent from '../components/ConsentPolicyContent';

const ConsentPolicy = () => {
  const navigate = useNavigate();
  return (
    <Container className="py-5" style={{ maxWidth: '800px' }}>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4 p-md-5">
          <h2 className="fw-bold mb-4 text-center">개인정보 수집 및 이용 동의서</h2>
          <ConsentPolicyContent />

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

export default ConsentPolicy;
