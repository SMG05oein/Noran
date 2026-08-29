import React from 'react';
import { Container, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { RiRestaurantLine, RiArrowLeftLine, RiHome4Line } from 'react-icons/ri';
import './Auth.css';

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
    <div className="auth-container">
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <Card className="auth-card border-0 text-center mx-auto" style={{ maxWidth: '480px' }}>
          <Card.Body className="p-5">
            <div className="auth-brand-logo mb-3 shadow-xs">
              <RiRestaurantLine />
            </div>
            <h1 className="display-3 fw-bold text-primary mb-2" style={{ letterSpacing: '-0.05em' }}>404</h1>
            <h3 className="fw-bold text-dark mb-3">페이지를 찾을 수 없습니다</h3>
            <p className="text-muted mb-4 pb-2" style={{ lineHeight: '1.6' }}>
              존재하지 않는 페이지이거나 주소가 변경되었습니다.<br />
              입력하신 주소가 정확한지 다시 한 번 확인해 주세요.
            </p>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              <Button 
                variant="outline-secondary" 
                size="lg" 
                className="fw-bold px-4 rounded-pill d-flex align-items-center gap-1"
                onClick={() => navigate(-1)}
              >
                <RiArrowLeftLine /> 이전 화면
              </Button>
              <Button 
                variant="primary" 
                size="lg" 
                className="fw-bold px-4 rounded-pill shadow-xs d-flex align-items-center gap-1"
                onClick={handleGoHome}
              >
                <RiHome4Line /> 홈으로 가기
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default NotFound;
