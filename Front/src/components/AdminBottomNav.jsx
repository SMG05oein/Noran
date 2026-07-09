import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaChartBar, FaCheckSquare, FaUsers, FaCog, FaHistory, FaBuilding } from 'react-icons/fa';
import './BottomNav.css';

const AdminBottomNav = () => {
  return (
    <div className="bottom-nav admin-theme d-lg-none">
      <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <FaChartBar className="icon" />
        <span>대시보드</span>
      </NavLink>

      <NavLink to="/admin/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <FaHistory className="icon" />
        <span>기록관리</span>
      </NavLink>
      <NavLink to="/admin/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <FaUsers className="icon" />
        <span>직원관리</span>
      </NavLink>
      <NavLink to="/admin/workplaces" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <FaBuilding className="icon" />
        <span>지점관리</span>
      </NavLink>
    </div>
  );
};

export default AdminBottomNav;
