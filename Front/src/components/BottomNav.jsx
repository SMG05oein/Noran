import React from 'react';
import { NavLink } from 'react-router-dom';
import { RiCalendar2Line, RiFileList3Line, RiCalendarCheckLine, RiUser3Line } from 'react-icons/ri';
import './BottomNav.css';

const BottomNav = () => {
  return (
    <nav className="bottom-nav d-lg-none" aria-label="모바일 하단 내비게이션">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <RiCalendar2Line className="icon" />
        <span>캘린더</span>
      </NavLink>
      <NavLink to="/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiFileList3Line className="icon" />
        <span>근무기록</span>
      </NavLink>
      <NavLink to="/requests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiCalendarCheckLine className="icon" />
        <span>근무신청</span>
      </NavLink>
      <NavLink to="/mypage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <RiUser3Line className="icon" />
        <span>내 정보</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
