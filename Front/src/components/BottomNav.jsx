import React from 'react';
import { NavLink } from 'react-router-dom';
import { RiCalendar2Line, RiFileList3Line, RiCalendarCheckLine, RiUser3Line } from 'react-icons/ri';
import './BottomNav.css';

const BottomNav = () => {
  return (
    <nav className="bottom-nav d-lg-none" aria-label="모바일 하단 내비게이션">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <div className="icon-wrapper"><RiCalendar2Line className="icon" /></div>
        <span>홈</span>
      </NavLink>
      <NavLink to="/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div className="icon-wrapper"><RiFileList3Line className="icon" /></div>
        <span>근무기록</span>
      </NavLink>
      <NavLink to="/requests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div className="icon-wrapper"><RiCalendarCheckLine className="icon" /></div>
        <span>근무신청</span>
      </NavLink>
      <NavLink to="/mypage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div className="icon-wrapper"><RiUser3Line className="icon" /></div>
        <span>내 정보</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
