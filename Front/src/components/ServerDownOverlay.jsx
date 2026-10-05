import React from 'react';
import { Container, Spinner, Button } from 'react-bootstrap';
import { RiServerLine, RiRefreshLine } from 'react-icons/ri';
import useServerStateStore from '../store/useServerStateStore';

const ServerDownOverlay = () => {
  const { isServerDown, setServerDown } = useServerStateStore();

  if (!isServerDown) return null;

  const handleRetry = () => {
    // 임시로 오버레이를 닫고 페이지 새로고침
    setServerDown(false);
    window.location.reload();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
        padding: '1rem',
      }}
    >
      <Container className="bg-white text-dark rounded-4 shadow-lg p-4 p-md-5 text-center" style={{ maxWidth: '500px' }}>
        <div className="mb-4 text-danger">
          <RiServerLine size={64} className="opacity-75" />
        </div>
        <h3 className="fw-bold mb-3">서버 연결 지연</h3>
        <p className="text-muted mb-4" style={{ wordBreak: 'keep-all' }}>
          현재 백엔드 서버가 재시작 중이거나 통신이 원활하지 않습니다.<br />
          버전 배포 또는 안정화 작업이 진행 중일 수 있습니다.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <Button variant="primary" className="fw-bold px-4 py-2 d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={handleRetry}>
            <RiRefreshLine size={20} /> 다시 시도하기
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default ServerDownOverlay;
