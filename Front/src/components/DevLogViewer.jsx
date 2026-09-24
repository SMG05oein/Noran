import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { fetchDevLogs, downloadDevLogs } from '../api/devAuthApi';

const DevLogViewer = () => {
  const [logsData, setLogsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [lines, setLines] = useState(200);
  const [level, setLevel] = useState('');
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logContainerRef = useRef(null);

  const loadLogs = async () => {
    setLoading(true);
    const res = await fetchDevLogs(lines, { level, keyword });
    if (res.success) setLogsData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [lines, level, keyword]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, lines, level, keyword]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logsData]);

  const applyKeyword = (e) => {
    e.preventDefault();
    setKeyword(keywordInput.trim());
  };

  const handleDownload = async () => {
    setDownloading(true);
    const res = await downloadDevLogs(Math.max(lines, 2000), { level, keyword });
    if (res.success) {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'app-logs.txt';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert(res.error);
    }
    setDownloading(false);
  };

  const formatLogLine = (line) => {
    if (line.includes('ERROR')) {
      return <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{line}</span>;
    }
    if (line.includes('WARN')) {
      return <span style={{ color: '#fca5a5' }}>{line}</span>;
    }
    if (line.includes('INFO')) {
      return <span style={{ color: '#34d399' }}>{line}</span>;
    }
    if (line.includes('DEBUG')) {
      return <span style={{ color: '#60a5fa' }}>{line}</span>;
    }
    return <span style={{ color: '#d1d5db' }}>{line}</span>;
  };

  return (
    <Card className="shadow-sm border-0 rounded-4">
      <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold">실시간 서버 로그 뷰어</span>
          {logsData?.available && <Badge bg="success">실시간 작동 중</Badge>}
          {logsData?.filtered && (
            <Badge bg="info">
              필터 {logsData.matchedLines ?? logsData.totalLines ?? 0}줄
            </Badge>
          )}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
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
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            style={{ width: '110px' }}
          >
            <option value="">전체 레벨</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
            <option value="DEBUG">DEBUG</option>
          </Form.Select>
          <Form.Select
            size="sm"
            value={lines}
            onChange={(e) => setLines(Number(e.target.value))}
            style={{ width: '110px' }}
          >
            <option value={50}>50 줄</option>
            <option value={100}>100 줄</option>
            <option value={200}>200 줄</option>
            <option value={500}>500 줄</option>
          </Form.Select>
          <Form onSubmit={applyKeyword} className="d-flex gap-1">
            <Form.Control
              size="sm"
              placeholder="키워드"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              style={{ width: '140px' }}
            />
            <Button variant="outline-secondary" size="sm" type="submit">검색</Button>
          </Form>
          <Button variant="outline-info" size="sm" onClick={loadLogs} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : '새로고침'}
          </Button>
          <Button variant="outline-success" size="sm" onClick={handleDownload} disabled={downloading || !logsData?.available}>
            {downloading ? <Spinner animation="border" size="sm" /> : '다운로드'}
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-3">
        {logsData && !logsData.available && (
          <Alert variant="warning" className="py-2 mb-3">
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
            lineHeight: '1.5',
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
