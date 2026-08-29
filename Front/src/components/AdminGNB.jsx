import React from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { RiLogoutBoxRLine, RiSunLine, RiMoonLine } from 'react-icons/ri';
import './GNB.css';

const AdminGNB = () => {
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
    <Navbar expand="lg" className="custom-gnb admin-gnb shadow-sm sticky-top">
      <Container className="d-flex justify-content-between align-items-center">
        <Link to="/admin" className="gnb-brand">
          <span className="gnb-brand-highlight fs-4">{displayName || '노란돼지'}</span>
          <Badge bg="danger" className="ms-2 px-2 py-1 fs-6">관리자</Badge>
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
          <Nav className="ms-auto align-items-center gap-1">
            <Nav.Link as={Link} to="/admin" className={`gnb-link ${location.pathname === '/admin' ? 'active-pill' : ''}`}>대시보드</Nav.Link>
            <Nav.Link as={Link} to="/admin/records" className={`gnb-link ${location.pathname.startsWith('/admin/records') ? 'active-pill' : ''}`}>기록 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/employees" className={`gnb-link ${location.pathname.startsWith('/admin/employees') ? 'active-pill' : ''}`}>직원 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/workplaces" className={`gnb-link ${location.pathname.startsWith('/admin/workplaces') ? 'active-pill' : ''}`}>지점 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/user-types" className={`gnb-link ${location.pathname.startsWith('/admin/user-types') ? 'active-pill' : ''}`}>직급 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/mypage" className={`gnb-link ${location.pathname.startsWith('/admin/mypage') ? 'active-pill' : ''}`}>마이페이지</Nav.Link>
            
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

export default AdminGNB;
