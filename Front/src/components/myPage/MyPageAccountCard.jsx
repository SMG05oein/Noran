import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { RiShieldCheckLine } from 'react-icons/ri';

const MyPageAccountCard = ({ userInfo }) => {
  return (
    <Card className="border-0 shadow-sm rounded-4 mb-4">
      <Card.Body className="p-4">
        <div className="fw-bold text-muted small mb-3 d-flex align-items-center gap-1">
          <RiShieldCheckLine className="text-primary" /> 기본 계정 정보
        </div>
        <div className="p-3 rounded-3" style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}>
          <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
            <div className="text-muted fw-bold small">아이디</div>
            <div className="fw-bold" style={{ color: 'var(--color-input-text)' }}>{userInfo?.userId || '-'}</div>
          </div>
          <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
            <div className="text-muted fw-bold small">직급 및 역할</div>
            <div>
              <Badge bg="primary" className="px-2 py-1 me-1">{userInfo?.userTypeName || '직원'}</Badge>
              {userInfo?.is_admin === 1 && <Badge bg="danger" className="px-2 py-1">관리자</Badge>}
            </div>
          </div>
          <div className="d-flex align-items-center justify-content-between">
            <div className="text-muted fw-bold small">시급</div>
            <div className="fw-bold text-success">
              {userInfo?.userHourlyWage != null ? `${Number(userInfo.userHourlyWage).toLocaleString()}원` : '관리자 미기재'}
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default MyPageAccountCard;

