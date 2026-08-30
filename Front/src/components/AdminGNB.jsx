import React, { useState } from 'react';
import { Navbar, Nav, Container, Badge, Offcanvas } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { RiLogoutBoxRLine, RiSunLine, RiMoonLine, RiMenuLine } from 'react-icons/ri';
import TermsModal from './TermsModal';
import PrivacyModal from './PrivacyModal';
import './GNB.css';

const AdminGNB = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [showMenu, setShowMenu] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = user?.branch || '노란돼지';
  const displayName = fullName.split('(')[0].trim();

  return (
    <>
      <Navbar expand="lg" className="custom-gnb admin-gnb shadow-sm sticky-top">
        <Container className="d-flex justify-content-between align-items-center">
          <Link to="/admin" className="gnb-brand">
            <span className="gnb-brand-highlight fs-4">{displayName || '노란돼지'}</span>
            <Badge bg="danger" className="ms-2 px-2 py-1 fs-6">관리자</Badge>
          </Link>

          {/* 모바일 화면에서만 보이는 다크모드/햄버거 메뉴 아이콘 영역 */}
          <div className="d-lg-none d-flex align-items-center gap-2">
            <button 
              type="button" 
              onClick={toggleTheme} 
              className="theme-toggle-btn"
              aria-label="테마 전환"
            >
              {theme === 'dark' ? <RiSunLine size={20} className="text-warning" /> : <RiMoonLine size={20} />}
            </button>
            <button 
              type="button" 
              onClick={() => setShowMenu(true)}
              className="theme-toggle-btn border-0 bg-transparent"
              aria-label="메뉴 열기"
            >
              <RiMenuLine size={22} className={theme === 'dark' ? 'text-white' : 'text-dark'} />
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

      {/* 모바일 햄버거 메뉴 (Offcanvas) */}
      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} placement="end" className="d-lg-none" style={{ maxWidth: '280px' }}>
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold fs-5 text-danger">관리자 메뉴</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-4">
          <div className="mb-4 bg-light p-3 rounded-3">
            <h6 className="fw-bold text-dark mb-2">회사 소개</h6>
            <div className="text-muted small mb-1">대표: 최재복</div>
            <div className="text-muted small mb-1">대표 번호: 010-5833-9279</div>
            <div className="text-muted small">시스템 개선 문의:<br/>010-2011-1392 (카톡만)</div>
          </div>
          
          <div className="d-flex flex-column gap-2 mb-auto">
            <button 
              className="btn btn-outline-secondary text-start fw-bold py-2 px-3 border-0 bg-transparent text-dark hover-bg"
              onClick={() => { setShowMenu(false); setShowTerms(true); }}
            >
              이용약관
            </button>
            <button 
              className="btn btn-outline-secondary text-start fw-bold py-2 px-3 border-0 bg-transparent text-dark hover-bg"
              onClick={() => { setShowMenu(false); setShowPrivacy(true); }}
            >
              개인정보처리방침
            </button>
          </div>

          <div className="mt-4 pt-4 border-top">
            <button 
              className="btn btn-danger w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2"
              onClick={handleLogout}
            >
              <RiLogoutBoxRLine size={18} /> 로그아웃
            </button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <TermsModal show={showTerms} onHide={() => setShowTerms(false)} />
      <PrivacyModal show={showPrivacy} onHide={() => setShowPrivacy(false)} />
    </>
  );
};

export default AdminGNB;
