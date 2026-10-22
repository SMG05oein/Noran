import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner } from 'react-bootstrap';
import { fetchDevLogs, downloadDevLogs } from '../api/devAuthApi';

const DevLogViewer = ({ initialLevel = '', initialKeyword = '' }) => {
  const [logsData, setLogsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [lines, setLines] = useState(200);
  const [level, setLevel] = useState(initialLevel || '');
  const [keyword, setKeyword] = useState(initialKeyword || '');
  const [keywordInput, setKeywordInput] = useState(initialKeyword || '');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [followBottom, setFollowBottom] = useState(true);
  const logContainerRef = useRef(null);
  const stickRef = useRef(true);

  useEffect(() => {
    if (initialLevel != null) setLevel(initialLevel || '');
  }, [initialLevel]);

  useEffect(() => {
    if (initialKeyword != null) {
      setKeyword(initialKeyword || '');
      setKeywordInput(initialKeyword || '');
    }
  }, [initialKeyword]);

  const loadLogs = useCallback(async ({ quiet } = {}) => {
    if (!quiet) setLoading(true);
    const res = await fetchDevLogs(lines, { level, keyword });
    if (res.success) setLogsData(res.data);
    if (!quiet) setLoading(false);
  }, [lines, level, keyword]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => loadLogs({ quiet: true }), 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  useEffect(() => {
    const el = logContainerRef.current;
    if (!el || !followBottom || !stickRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [logsData, followBottom]);

  const onScroll = () => {
    const el = logContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    stickRef.current = nearBottom;
  };

  const applyKeyword = (e) => {
    e.preventDefault();
    setKeyword(keywordInput.trim());
  };

  const setErrorOnly = () => {
    setLevel('ERROR');
    setKeyword('');
    setKeywordInput('');
  };

  const clearFilters = () => {
    setLevel('');
    setKeyword('');
    setKeywordInput('');
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
      return <span style={{ color: '#f85149', fontWeight: 600 }}>{line}</span>;
    }
    if (line.includes('WARN')) {
      return <span style={{ color: '#d29922' }}>{line}</span>;
    }
    if (line.includes('INFO')) {
      return <span style={{ color: '#3fb950' }}>{line}</span>;
    }
    if (line.includes('DEBUG')) {
      return <span style={{ color: '#58a6ff' }}>{line}</span>;
    }
    return <span style={{ color: '#c9d1d9' }}>{line}</span>;
  };

  return (
    <div className="dc-panel">
      <div className="dc-panel-head">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h2 className="dc-panel-title mb-0">실시간 서버 로그</h2>
          {logsData?.available && <span className="dc-pill dc-pill-ok">연결됨</span>}
          {!autoRefresh && <span className="dc-pill dc-pill-warn">일시정지</span>}
          {logsData?.filtered && (
            <span className="dc-pill dc-pill-info">
              필터 {logsData.matchedLines ?? logsData.totalLines ?? 0}줄
            </span>
          )}
        </div>
      </div>
      <div className="dc-panel-body">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <button
            type="button"
            className={`dc-btn ${autoRefresh ? 'dc-btn-ghost' : 'dc-btn-warn'}`}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? '일시정지' : '재개'}
          </button>
          <button
            type="button"
            className={`dc-btn ${followBottom ? 'dc-btn-accent' : 'dc-btn-ghost'}`}
            onClick={() => {
              setFollowBottom((v) => !v);
              stickRef.current = true;
            }}
          >
            {followBottom ? '맨 아래 고정 ON' : '맨 아래 고정 OFF'}
          </button>
          <button type="button" className="dc-btn dc-btn-danger" onClick={setErrorOnly}>
            ERROR만
          </button>
          <button type="button" className="dc-btn dc-btn-ghost" onClick={clearFilters}>
            필터 해제
          </button>
          <select
            className="form-select form-select-sm"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            style={{ width: 110 }}
          >
            <option value="">전체 레벨</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
            <option value="DEBUG">DEBUG</option>
          </select>
          <select
            className="form-select form-select-sm"
            value={lines}
            onChange={(e) => setLines(Number(e.target.value))}
            style={{ width: 100 }}
          >
            <option value={50}>50줄</option>
            <option value={100}>100줄</option>
            <option value={200}>200줄</option>
            <option value={500}>500줄</option>
          </select>
          <form onSubmit={applyKeyword} className="d-flex gap-1">
            <input
              className="form-control form-control-sm"
              placeholder="키워드"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              style={{ width: 140 }}
            />
            <button type="submit" className="dc-btn dc-btn-ghost">검색</button>
          </form>
          <button type="button" className="dc-btn dc-btn-info" onClick={() => loadLogs()} disabled={loading}>
            {loading ? '…' : '새로고침'}
          </button>
          <button
            type="button"
            className="dc-btn dc-btn-ghost"
            onClick={handleDownload}
            disabled={downloading || !logsData?.available}
          >
            {downloading ? '…' : '다운로드'}
          </button>
        </div>

        {logsData && !logsData.available && (
          <div className="dc-alert dc-alert-bad mb-3">
            {logsData.message || '로컬 환경이거나 로그 파일을 찾을 수 없습니다.'}
          </div>
        )}

        <div
          ref={logContainerRef}
          onScroll={onScroll}
          className="hide-scrollbar"
          style={{
            backgroundColor: '#010409',
            color: '#c9d1d9',
            fontFamily: 'var(--dc-mono)',
            fontSize: '0.82rem',
            padding: '0.85rem 1rem',
            borderRadius: 8,
            border: '1px solid var(--dc-border)',
            height: 'min(62vh, 560px)',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            lineHeight: 1.55,
          }}
        >
          {loading && !logsData ? (
            <div className="dc-empty">
              <Spinner animation="border" size="sm" />
            </div>
          ) : logsData?.logs?.length > 0 ? (
            logsData.logs.map((line, idx) => (
              <div key={idx}>{formatLogLine(line)}</div>
            ))
          ) : (
            <div className="dc-empty">출력할 로그가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevLogViewer;
