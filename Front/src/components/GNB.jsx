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
  const displayName = fullName.split('(')[0].trim();

  return (
    <Navbar expand="lg" className="custom-gnb shadow-sm sticky-top">
      <Container className="d-flex justify-content-between align-items-center">
        <Link to="/" className="gnb-brand">
          <span className="gnb-brand-highlight fs-4">{displayName || '노란돼지'}</span>
        </Link>

        {/* 모바일 화면에서만 보이는 다크모드/로그아웃 아이콘 영역 */}
        <div className="d-lg-none d-flex align-items-center gap-2">
          <button 
            type="button" 
            onClick={toggleTheme} 
            className="theme-toggle-btn"
            aria-label="테마 전환"
          >
            {theme === 'dark' ? <RiSunLine size={18} className="text-warning" /> : <RiMoonLine size={18} />}
          </button>
          <button 
            type="button" 
            onClick={handleLogout} 
            className="theme-toggle-btn"
            aria-label="로그아웃"
          >
            <RiLogoutBoxRLine size={18} />
          </button>
        </div>

        {/* 데스크톱 화면에서만 보이는 상단 메뉴 */}
        <div className="d-none d-lg-block">
          <Nav className="ms-auto align-items-center gap-2">
            <Nav.Link as={Link} to="/" className={`gnb-link ${location.pathname === '/' ? 'active-pill' : ''}`}>홈 / 캘린더</Nav.Link>
            <Nav.Link as={Link} to="/records" className={`gnb-link ${location.pathname.startsWith('/records') ? 'active-pill' : ''}`}>근무기록</Nav.Link>
            <Nav.Link as={Link} to="/requests" className={`gnb-link ${location.pathname.startsWith('/requests') ? 'active-pill' : ''}`}>근무신청</Nav.Link>
            <Nav.Link as={Link} to="/mypage" className={`gnb-link ${location.pathname.startsWith('/mypage') ? 'active-pill' : ''}`}>마이페이지</Nav.Link>
            
            <div className="ms-2 d-flex align-items-center gap-2">
              <button 
                type="button"
                onClick={toggleTheme} 
                className="theme-toggle-btn"
              >
                {theme === 'dark' ? <><RiSunLine size={16} className="text-warning" /> 라이트</> : <><RiMoonLine size={16} /> 다크</>}
              </button>
              <button 
                type="button"
                onClick={handleLogout} 
                className="gnb-logout"
              >
                로그아웃
              </button>
            </div>
          </Nav>
        </div>
      </Container>
    </Navbar>
  );
};

export default GNB;
