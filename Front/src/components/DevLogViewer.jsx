import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { fetchDevLogs } from '../api/devAuthApi';

const DevLogViewer = () => {
  const [logsData, setLogsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState(200);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logContainerRef = useRef(null);

  const loadLogs = async () => {
    setLoading(true);
    const res = await fetchDevLogs(lines);
    if (res.success) {
      setLogsData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [lines]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, lines]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logsData]);

  const formatLogLine = (line) => {
    if (line.includes('ERROR')) {
      return <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{line}</span>;
    } else if (line.includes('WARN')) {
      return <span style={{ color: '#fca5a5' }}>{line}</span>;
    } else if (line.includes('INFO')) {
      return <span style={{ color: '#34d399' }}>{line}</span>;
    } else if (line.includes('DEBUG')) {
      return <span style={{ color: '#60a5fa' }}>{line}</span>;
    }
    return <span style={{ color: '#d1d5db' }}>{line}</span>;
  };

  return (
    <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
      <Card.Header className="d-flex justify-content-between align-items-center" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold">실시간 서버 로그 뷰어</span>
          {logsData?.available && <Badge bg="success">실시간 작동 중</Badge>}
        </div>
        <div className="d-flex align-items-center gap-3">
          <Form.Check
            type="switch"
            id="auto-refresh-switch"
            label="자동 갱신 (3초)"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="text-light small"
          />
          <Form.Select
            size="sm"
            value={lines}
            onChange={(e) => setLines(Number(e.target.value))}
            style={{ width: '110px', backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
          >
            <option value={50}>50 줄</option>
            <option value={100}>100 줄</option>
            <option value={200}>200 줄</option>
            <option value={500}>500 줄</option>
          </Form.Select>
          <Button variant="outline-info" size="sm" onClick={loadLogs} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : '새로고침'}
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-3">
        {logsData && !logsData.available && (
          <Alert variant="warning" className="py-2 mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {logsData.message || '로컬 환경이거나 로그 파일을 찾을 수 없습니다.'}
          </Alert>
        )}

        <div
          ref={logContainerRef}
          className="hide-scrollbar"
          style={{
            backgroundColor: '#0d1117',
            color: '#c9d1d9',
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            fontSize: '0.85rem',
            padding: '1rem',
            borderRadius: '8px',
            height: '500px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            lineHeight: '1.5'
          }}
        >
          {loading && !logsData ? (
            <div className="text-center py-5 text-muted">로그를 불러오는 중입니다...</div>
          ) : logsData?.logs && logsData.logs.length > 0 ? (
            logsData.logs.map((line, idx) => (
              <div key={idx}>{formatLogLine(line)}</div>
            ))
          ) : (
            <div className="text-center text-muted py-5">출력할 로그 데이터가 없습니다.</div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default DevLogViewer;
