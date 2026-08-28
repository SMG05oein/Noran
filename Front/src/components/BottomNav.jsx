import React from 'react';
import { NavLink } from 'react-router-dom';
import { RiHome4Line, RiFileList3Line, RiCalendar2Line, RiUser3Line } from 'react-icons/ri';
import './BottomNav.css';

const BottomNav = () => {
  return (
    <div className="bottom-nav d-lg-none">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <RiHome4Line className="icon" />
        <span>캘린더</span>
      </NavLink>
      <NavLink to="/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiFileList3Line className="icon" />
        <span>근무기록</span>
      </NavLink>
      <NavLink to="/requests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiCalendar2Line className="icon" />
        <span>근무신청</span>
      </NavLink>
      <NavLink to="/mypage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiUser3Line className="icon" />
        <span>마이페이지</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;
