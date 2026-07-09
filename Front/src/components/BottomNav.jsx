import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaClipboardList, FaCalendarAlt, FaUser } from 'react-icons/fa';
import './BottomNav.css';

const BottomNav = () => {
  return (
    <div className="bottom-nav d-lg-none">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <FaHome className="icon" />
        <span>캘린더</span>
      </NavLink>
      <NavLink to="/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <FaClipboardList className="icon" />
        <span>근무기록</span>
      </NavLink>
      <NavLink to="/requests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <FaCalendarAlt className="icon" />
        <span>근무신청</span>
      </NavLink>
      <NavLink to="/mypage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <FaUser className="icon" />
        <span>마이페이지</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;
