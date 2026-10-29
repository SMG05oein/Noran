import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import { RiStore2Line, RiCalendarCheckLine, RiAddLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

const WorkerHeroCard = ({ actualBranchName, user, todayRecord }) => {
  const navigate = useNavigate();

  return (
    <div className="worker-hero-card mb-4">
      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
        <Badge bg="secondary" className="px-2 py-1 fw-bold d-inline-flex align-items-center gap-1">
          <RiStore2Line /> {actualBranchName}
        </Badge>
        {user?.userType && (
          <Badge bg="primary" className="px-2 py-1">
            {user.userType}
          </Badge>
        )}
      </div>
      <h3 className="worker-hero-title mb-1 text-truncate">
        안녕하세요, <span style={{ color: 'var(--color-primary)' }}>{user?.name || '직원'}</span>님!
      </h3>
      <p className="text-muted mb-3 small fw-semibold text-truncate">
        {todayRecord
          ? '오늘 근무가 기록되었습니다.'
          : '오늘도 활기찬 하루 보내세요!'}
      </p>

      <div className="worker-quick-actions">
        {todayRecord ? (
          <div className="today-status-badge worker-quick-btn">
            <RiCalendarCheckLine size={18} />
            <span>근무 완료</span>
          </div>
        ) : (
          <Button
            variant="primary"
            className="quick-action-btn worker-quick-btn"
            onClick={() => navigate('/records')}
          >
            <RiAddLine size={20} />
            <span>근무 기록하기</span>
          </Button>
        )}
        <Button
          variant="outline-secondary"
          className="quick-action-btn worker-quick-btn"
          onClick={() => navigate('/requests')}
        >
          <RiCalendarCheckLine size={18} />
          <span>근무 신청</span>
        </Button>
      </div>
    </div>
  );
};

export default WorkerHeroCard;

