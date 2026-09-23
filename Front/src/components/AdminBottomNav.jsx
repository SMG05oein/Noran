import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import { RiBarChartBoxLine, RiHistoryLine, RiMoneyDollarCircleLine, RiGroupLine, RiStore2Line, RiUserStarLine, RiUserSmileLine, RiMore2Line, RiChatSmile2Line } from 'react-icons/ri';
import './BottomNav.css';

const CustomToggle = React.forwardRef(({ children, onClick, className }, ref) => (
  <div
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
    className={className}
    style={{ cursor: 'pointer', flex: 1 }}
  >
    {children}
  </div>
));

const AdminBottomNav = () => {
  const location = useLocation();
  const isMiscActive = ['/admin/workplaces', '/admin/user-types', '/admin/board'].some(p => location.pathname.startsWith(p));

  return (
    <nav className="bottom-nav admin-theme d-lg-none" aria-label="관리자 모바일 하단 내비게이션">
      <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <RiBarChartBoxLine className="icon" />
        <span>메인</span>
      </NavLink>
      <NavLink to="/admin/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiHistoryLine className="icon" />
        <span>기록</span>
      </NavLink>
      <NavLink to="/admin/payroll" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiMoneyDollarCircleLine className="icon" />
        <span>급여</span>
      </NavLink>
      <NavLink to="/admin/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiGroupLine className="icon" />
        <span>직원</span>
      </NavLink>
      <Dropdown drop="up" className="d-flex" style={{ flex: 1 }}>
        <Dropdown.Toggle as={CustomToggle} className={`nav-item ${isMiscActive ? 'active' : ''}`}>
          <RiMore2Line className="icon" />
          <span>기타</span>
        </Dropdown.Toggle>
        <Dropdown.Menu className="shadow-lg border-0 rounded-3 mb-2" style={{ minWidth: '120px' }}>
          <Dropdown.Item as={Link} to="/admin/workplaces" className="fw-bold py-2 text-dark">
            <RiStore2Line className="me-2 text-primary" /> 지점
          </Dropdown.Item>
          <Dropdown.Item as={Link} to="/admin/user-types" className="fw-bold py-2 text-dark">
            <RiUserStarLine className="me-2 text-primary" /> 직급
          </Dropdown.Item>
          <Dropdown.Item as={Link} to="/admin/board" className="fw-bold py-2 text-dark">
            <RiChatSmile2Line className="me-2 text-primary" /> 게시판
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      <NavLink to="/admin/mypage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiUserSmileLine className="icon" />
        <span>내 정보</span>
      </NavLink>
    </nav>
  );
};

export default AdminBottomNav;
