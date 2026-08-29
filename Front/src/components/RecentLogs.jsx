import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { format } from 'date-fns';
import { RiCheckboxCircleLine, RiTimeLine, RiCalendarCheckLine, RiErrorWarningLine, RiHistoryLine } from 'react-icons/ri';

const RecentLogs = ({ mockRecords }) => {
  // 상태에 따른 배지와 아이콘 설정 헬퍼
  const getStatusInfo = (status) => {
    switch (status) {
      case 'WORKED':
        return { text: '근무 완료', bg: 'success', icon: <RiCheckboxCircleLine className="me-1" /> };
      case 'REQUESTED':
        return { text: '신청 대기', bg: 'secondary', icon: <RiTimeLine className="me-1" /> };
      case 'APPROVED':
        return { text: '수락됨', bg: 'primary', icon: <RiCalendarCheckLine className="me-1" /> };
      case 'MISSING':
        return { text: '미기재', bg: 'danger', icon: <RiErrorWarningLine className="me-1" /> };
      default:
        return { text: '알 수 없음', bg: 'light', icon: null };
    }
  };

  // 최신 순으로 정렬 후 5개만 가져오기
  const recent5 = [...mockRecords]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  return (
    <Card className="border-0 shadow-sm rounded-4 h-100">
      <Card.Body className="p-4 d-flex flex-column">
        <h4 className="fw-bold mb-4 text-primary d-flex align-items-center gap-2">
          <RiHistoryLine /> 최근 근무 내역
        </h4>
        <ListGroup variant="flush" className="flex-grow-1">
          {recent5.length > 0 ? (
            recent5.map((record, idx) => {
              const info = getStatusInfo(record.status);
              return (
                <ListGroup.Item 
                  key={idx} 
                  className="bg-transparent px-0 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ borderColor: 'var(--color-input-border)' }}
                >
                  <div>
                    <div className="fw-bold fs-6 text-dark mb-1">
                      {format(record.date, 'yyyy년 MM월 dd일')}
                    </div>
                    {record.status === 'WORKED' && record.startTime && record.endTime && (
                      <div className="text-muted small d-flex align-items-center gap-1">
                        <RiTimeLine /> {record.startTime} ~ {record.endTime}
                      </div>
                    )}
                    {record.status === 'MISSING' && (
                      <div className="text-danger small fw-semibold d-flex align-items-center gap-1">
                        <RiErrorWarningLine /> 출퇴근 기록 누락
                      </div>
                    )}
                  </div>
                  <Badge bg={info.bg} className="p-2 px-3 rounded-pill fs-6 d-flex align-items-center shadow-xs">
                    {info.icon}
                    {info.text}
                  </Badge>
                </ListGroup.Item>
              );
            })
          ) : (
            <div className="text-center text-muted py-5 my-auto">
              <RiHistoryLine size={36} className="mb-2 opacity-50" />
              <p className="mb-0">최근 근무 내역이 없습니다.</p>
            </div>
          )}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default RecentLogs;
