import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { RiLogoutBoxRLine, RiSunLine, RiMoonLine } from 'react-icons/ri';
import './GNB.css';

const GNB = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = user?.branch || '노란돼지';
  // "(" 문자 전까지 자르고 공백 제거
  const displayName = fullName.split('(')[0].trim();

  return (
    <Navbar expand="lg" className="custom-gnb shadow-sm" sticky="top" bg="dark" variant="dark">
      <Container className="d-flex justify-content-between">
        <Navbar.Brand as={Link} to="/" className="fw-bold gnb-brand fs-4 text-white">
          {displayName}
        </Navbar.Brand>

        {/* 모바일 화면에서만 보이는 다크모드/로그아웃 아이콘 영역 */}
        <div className="d-lg-none d-flex align-items-center gap-3">
          <div onClick={toggleTheme} style={{ cursor: 'pointer' }}>
            {theme === 'dark' ? <RiSunLine size={22} className="text-warning" /> : <RiMoonLine size={22} className="text-secondary" />}
          </div>
          <div onClick={handleLogout} style={{ cursor: 'pointer' }} className="d-flex align-items-center">
            <RiLogoutBoxRLine size={22} style={{ color: 'var(--color-text-main)' }} />
          </div>
        </div>

        {/* 데스크탑 화면에서만 보이는 상단 메뉴 (모바일에선 BottomNav로 대체) */}
        <div className="d-none d-lg-block">
          <Nav className="ms-auto align-items-center gap-2">
            <Nav.Link as={Link} to="/records" className={`gnb-link px-3 py-2 rounded-pill ${location.pathname.startsWith('/records') ? 'active-pill' : 'text-white'}`}>근무기록</Nav.Link>
            <Nav.Link as={Link} to="/requests" className={`gnb-link px-3 py-2 rounded-pill ${location.pathname.startsWith('/requests') ? 'active-pill' : 'text-white'}`}>근무신청</Nav.Link>
            <Nav.Link as={Link} to="/mypage" className={`gnb-link px-3 py-2 rounded-pill ${location.pathname.startsWith('/mypage') ? 'active-pill' : 'text-white'}`}>마이페이지</Nav.Link>
            <Nav.Link onClick={toggleTheme} className="gnb-link text-white px-3 py-2 rounded-pill d-flex align-items-center">
              {theme === 'dark' ? <><RiSunLine size={18} className="me-1 text-warning" /> 라이트</> : <><RiMoonLine size={18} className="me-1" /> 다크</>}
            </Nav.Link>
            <Nav.Link onClick={handleLogout} className="gnb-link gnb-logout text-white px-4 py-2 rounded-pill">
              로그아웃
            </Nav.Link>
          </Nav>
        </div>
      </Container>
    </Navbar>
  );
};

export default GNB;
