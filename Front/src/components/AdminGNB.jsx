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
    <Navbar expand="lg" className="custom-gnb shadow-sm" sticky="top" style={{ backgroundColor: 'var(--color-primary)' }} variant="dark">
      <Container className="d-flex justify-content-between">
        <Navbar.Brand as={Link} to="/admin" className="fw-bold gnb-brand fs-4 text-white">
          {displayName} <Badge bg="danger" className="ms-2 fs-6">관리자</Badge>
        </Navbar.Brand>

        {/* 모바일 화면에서만 보이는 다크모드/로그아웃 아이콘 영역 */}
        <div className="d-lg-none d-flex align-items-center gap-3">
          <div onClick={toggleTheme} style={{ cursor: 'pointer' }}>
            {theme === 'dark' ? <RiSunLine size={22} className="text-warning" /> : <RiMoonLine size={22} className="text-secondary" />}
          </div>
          <div onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <RiLogoutBoxRLine size={22} className="text-white" />
          </div>
        </div>

        {/* 데스크탑 화면에서만 보이는 상단 메뉴 (모바일에선 AdminBottomNav로 대체) */}
        <div className="d-none d-lg-block">
          <Nav className="ms-auto align-items-center gap-2">

            <Nav.Link as={Link} to="/admin/records" className={`gnb-link px-3 py-2 rounded-pill ${location.pathname.startsWith('/admin/records') ? 'active-pill' : 'text-white'}`}>기록 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/employees" className={`gnb-link px-3 py-2 rounded-pill ${location.pathname.startsWith('/admin/employees') ? 'active-pill' : 'text-white'}`}>직원 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/workplaces" className={`gnb-link px-3 py-2 rounded-pill ${location.pathname.startsWith('/admin/workplaces') ? 'active-pill' : 'text-white'}`}>지점 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/user-types" className={`gnb-link px-3 py-2 rounded-pill ${location.pathname.startsWith('/admin/user-types') ? 'active-pill' : 'text-white'}`}>직급 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/mypage" className={`gnb-link px-3 py-2 rounded-pill ${location.pathname.startsWith('/admin/mypage') ? 'active-pill' : 'text-white'}`}>마이페이지</Nav.Link>
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

export default AdminGNB;
