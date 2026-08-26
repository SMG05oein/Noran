import React from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { FaSignOutAlt } from 'react-icons/fa';
import './GNB.css';

const AdminGNB = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = user?.branch || '노란돼지';
  const displayName = fullName.split('(')[0].trim();

  return (
    <Navbar expand="lg" className="custom-gnb shadow-sm" sticky="top" style={{ backgroundColor: '#2c3e50' }} variant="dark">
      <Container className="d-flex justify-content-between">
        <Navbar.Brand as={Link} to="/admin" className="fw-bold gnb-brand fs-4 text-white">
          {displayName} <Badge bg="danger" className="ms-2 fs-6">관리자</Badge>
        </Navbar.Brand>

        {/* 모바일 화면에서만 보이는 로그아웃 아이콘 */}
        <div className="d-lg-none d-flex align-items-center" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <FaSignOutAlt size={22} className="text-white" />
        </div>

        {/* 데스크탑 화면에서만 보이는 상단 메뉴 (모바일에선 AdminBottomNav로 대체) */}
        <div className="d-none d-lg-block">
          <Nav className="ms-auto align-items-center gap-2">

            <Nav.Link as={Link} to="/admin/records" className="gnb-link text-white px-3 py-2 rounded-pill">기록 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/employees" className="gnb-link text-white px-3 py-2 rounded-pill">직원 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/workplaces" className="gnb-link text-white px-3 py-2 rounded-pill">지점 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/user-types" className="gnb-link text-white px-3 py-2 rounded-pill">직급 관리</Nav.Link>
            <Nav.Link as={Link} to="/admin/mypage" className="gnb-link text-white px-3 py-2 rounded-pill">마이페이지</Nav.Link>
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
