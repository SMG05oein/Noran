import React from 'react';
import { NavLink } from 'react-router-dom';
import { RiBarChartBoxLine, RiCheckboxLine, RiGroupLine, RiSettings4Line, RiHistoryLine, RiStore2Line, RiUserStarLine, RiUserSmileLine } from 'react-icons/ri';
import './BottomNav.css';

const AdminBottomNav = () => {
  return (
    <div className="bottom-nav admin-theme d-lg-none">
      <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <RiBarChartBoxLine className="icon" />
        <span>대시보드</span>
      </NavLink>

      <NavLink to="/admin/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiHistoryLine className="icon" />
        <span>기록관리</span>
      </NavLink>
      <NavLink to="/admin/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiGroupLine className="icon" />
        <span>직원관리</span>
      </NavLink>
      <NavLink to="/admin/workplaces" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiStore2Line className="icon" />
        <span>지점관리</span>
      </NavLink>
      <NavLink to="/admin/user-types" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiUserStarLine className="icon" />
        <span>직급관리</span>
      </NavLink>
      <NavLink to="/admin/mypage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiUserSmileLine className="icon" />
        <span>마이페이지</span>
      </NavLink>
    </div>
  );
};

export default AdminBottomNav;
