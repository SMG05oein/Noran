import React from 'react';
import { Container, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const NotFound = () => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  const handleGoHome = () => {
    if (user && user.isAdmin === 1) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <Container className="py-5">
        <Card className="border-0 shadow-lg rounded-4 overflow-hidden mx-auto" style={{ maxWidth: '500px' }}>
          <div className="bg-warning bg-opacity-25 text-center py-5">
            <h1 className="display-1 fw-bold text-warning mb-0" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>404</h1>
          </div>
          <Card.Body className="p-5 text-center">
            <h3 className="fw-bold text-dark mb-3">앗! 돼지가 길을 잃었어요 🐷</h3>
            <p className="text-muted mb-4 pb-2">
              고기가 다 타버렸거나, 없는 메뉴를 찾으신 것 같아요.<br />
              입력하신 주소가 정확한지 다시 한 번 확인해 주세요!
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <Button 
                variant="outline-warning" 
                size="lg" 
                className="fw-bold px-4 rounded-pill text-dark border-2"
                onClick={() => navigate(-1)}
              >
                이전 화면
              </Button>
              <Button 
                variant="warning" 
                size="lg" 
                className="fw-bold px-4 rounded-pill text-dark"
                onClick={handleGoHome}
              >
                메인으로 가기
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default NotFound;
