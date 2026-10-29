import React from 'react';
import { RiDashboardLine, RiCalendar2Line } from 'react-icons/ri';

const HomeTabSwitcher = ({ activeTab, onTabChange }) => {
  return (
    <div className="home-tab-switcher mb-3" role="tablist" aria-label="홈 보기 모드">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'status'}
        className={`home-tab-btn ${activeTab === 'status' ? 'active' : ''}`}
        onClick={() => onTabChange('status')}
      >
        <RiDashboardLine size={17} />
        <span>근무 현황</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'calendar'}
        className={`home-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
        onClick={() => onTabChange('calendar')}
      >
        <RiCalendar2Line size={17} />
        <span>캘린더</span>
      </button>
    </div>
  );
};

export default HomeTabSwitcher;

