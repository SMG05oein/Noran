import React, { useState } from 'react';
import { Navbar, Nav, Container, Offcanvas } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { RiLogoutBoxRLine, RiSunLine, RiMoonLine, RiMenuLine, RiUser3Line, RiMegaphoneLine, RiCalendarEventLine, RiShieldUserLine, RiNotification3Line, RiCustomerService2Line } from 'react-icons/ri';
import './GNB.css';

const GNB = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = user?.branch || '노란돼지';
  const displayName = fullName.split('(')[0].trim();

  return (
    <>
      <Navbar expand="lg" className="custom-gnb shadow-sm sticky-top">
        <Container className="d-flex justify-content-between align-items-center">
          <Link to="/" className="gnb-brand">
            <span className="gnb-brand-highlight fs-4">{displayName || '노란돼지'}</span>
          </Link>

          {/* 모바일 화면에서만 보이는 다크모드/햄버거 메뉴 영역 */}
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
            <Nav className="ms-auto align-items-center gap-2">
              <Nav.Link as={Link} to="/" className={`gnb-link ${location.pathname === '/' ? 'active-pill' : ''}`}>캘린더</Nav.Link>
              <Nav.Link as={Link} to="/records" className={`gnb-link ${location.pathname.startsWith('/records') ? 'active-pill' : ''}`}>근무기록</Nav.Link>
              <Nav.Link as={Link} to="/requests" className={`gnb-link ${location.pathname.startsWith('/requests') ? 'active-pill' : ''}`}>근무신청</Nav.Link>
              <Nav.Link as={Link} to="/mypage" className={`gnb-link ${location.pathname.startsWith('/mypage') ? 'active-pill' : ''}`}>내 정보</Nav.Link>

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
      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} placement="end" className="d-lg-none gnb-offcanvas">
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold fs-5">메뉴</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-4">
          <div className="gnb-sheet-profile mb-4 d-flex align-items-center gap-3 p-3 bg-light rounded-3 border">
            <div
              className="profile-avatar bg-primary text-white d-flex align-items-center justify-content-center rounded-circle shadow-sm"
              style={{ width: '46px', height: '46px', fontSize: '1.2rem', fontWeight: 'bold' }}
            >
              {user?.name ? user.name.charAt(0) : '👤'}
            </div>
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: '1.05rem' }}>{user?.name || '직원'}</div>
              <div className="small text-muted fw-semibold">{displayName || '노란돼지'}</div>
            </div>
          </div>
          <div className="gnb-company-info text-muted mb-4 mt-auto" style={{ fontSize: '0.75rem', lineHeight: '1.5' }}>
            <div className="fw-bold text-dark mb-1">노란돼지</div>
            <div className="mb-1">대표: 최재복</div>
            <div className="mb-1">주소: 서울 동작구 동작대로7길 97</div>
            <div className="mb-3">대표 번호: 010-5833-9279</div>

            <div className="fw-bold text-dark mb-1">시스템 개선 문의</div>
            <div className="mb-1">010-2011-1392 (카카오톡)</div>
            <div className="mb-1">010-3189-1392 (문자, 카카오톡)</div>
            <div className="mb-3">앱 버전: v0.8.0</div>

            <div style={{ fontSize: '0.7rem' }}>&copy; {new Date().getFullYear()} MinGwan-Seo. All rights reserved.</div>
          </div>

          <div className="pt-4 border-top">
            <div className="mb-4">
              <Link to="/privacy" className="gnb-sheet-link mb-2" onClick={() => setShowMenu(false)}>
                개인정보처리방침
              </Link>
              <Link to="/terms" className="gnb-sheet-link mb-2" onClick={() => setShowMenu(false)}>
                이용규정
              </Link>
              <Link to="/consent" className="gnb-sheet-link mb-2" onClick={() => setShowMenu(false)}>
                개인정보 수집 및 이용 동의서
              </Link>
              <Link to="/gathering" className="gnb-sheet-link mb-2" onClick={() => setShowMenu(false)}>
                돼지들 모임 🐷
              </Link>
            </div>

            <button
              type="button"
              className="btn btn-danger w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2"
              onClick={handleLogout}
            >
              <RiLogoutBoxRLine size={18} /> 로그아웃
            </button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

    </>
  );
};

export default GNB;
