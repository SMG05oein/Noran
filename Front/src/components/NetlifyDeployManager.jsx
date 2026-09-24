import React, { useEffect, useState } from 'react';
import { Card, Button, Spinner, Alert, Badge, Table, Form } from 'react-bootstrap';
import {
  fetchNetlifyStatus,
  fetchNetlifyDeploys,
  triggerNetlifyDeploy,
  rollbackNetlifyDeploy,
} from '../api/devAuthApi';
import DevExecutorAuthModal from './DevExecutorAuthModal';

const stateBadge = (state) => {
  const s = String(state || '').toLowerCase();
  if (s === 'ready' || s === 'current') return <Badge bg="success">{state}</Badge>;
  if (s === 'building' || s === 'enqueued' || s === 'processing') return <Badge bg="warning" text="dark">{state}</Badge>;
  if (s === 'error') return <Badge bg="danger">{state}</Badge>;
  return <Badge bg="secondary">{state || '-'}</Badge>;
};

const NetlifyDeployManager = () => {
  const [status, setStatus] = useState(null);
  const [deploys, setDeploys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearCache, setClearCache] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  const [pendingDeployId, setPendingDeployId] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const [statusRes, deploysRes] = await Promise.all([
      fetchNetlifyStatus(),
      fetchNetlifyDeploys(15),
    ]);

    if (statusRes.success) {
      setStatus(statusRes.data);
      if (statusRes.data?.configured === false) {
        setDeploys([]);
        setLoading(false);
        return;
      }
    } else {
      setError(statusRes.error);
    }

    if (deploysRes.success) {
      if (Array.isArray(deploysRes.data)) {
        setDeploys(deploysRes.data);
      } else if (deploysRes.data?.configured === false) {
        setStatus(deploysRes.data);
        setDeploys([]);
      }
    } else if (!error) {
      setError(deploysRes.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAuthConfirm = async (id, pw) => {
    setAuthLoading(true);
    let res;
    if (authMode === 'deploy') {
      res = await triggerNetlifyDeploy(id, pw, clearCache);
    } else if (authMode === 'rollback') {
      res = await rollbackNetlifyDeploy(id, pw, pendingDeployId);
    }
    if (res?.success) {
      alert(res.data?.message || (authMode === 'rollback' ? `롤백 요청됨: ${res.data?.deployId}` : '배포가 트리거되었습니다.'));
      setAuthMode(null);
      setPendingDeployId(null);
      load();
    } else {
      alert(res?.error || '요청 실패');
    }
    setAuthLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="info" />
      </div>
    );
  }

  if (status?.configured === false) {
    return (
      <Alert variant="warning" className="rounded-4">
        <strong>Netlify 미설정</strong>
        <div className="mt-1">{status.message || 'NETLIFY_TOKEN / NETLIFY_SITE_ID 를 서버 환경변수에 설정하세요.'}</div>
      </Alert>
    );
  }

  const published = status?.publishedDeploy;

  return (
    <div className="d-flex flex-column gap-4">
      {error && <Alert variant="danger" className="py-2">{error}</Alert>}

      <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
        <Card.Header
          className="fw-bold d-flex justify-content-between align-items-center"
          style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}
        >
          <span>사이트 현황</span>
          <Button variant="outline-info" size="sm" onClick={load}>새로고침</Button>
        </Card.Header>
        <Card.Body>
          <p className="mb-2"><strong>Site:</strong> {status?.siteName || '-'} <span className="text-secondary small">({status?.siteId})</span></p>
          <p className="mb-2">
            <strong>URL:</strong>{' '}
            {status?.url ? (
              <a href={status.url} target="_blank" rel="noreferrer" className="text-info">{status.url}</a>
            ) : '-'}
          </p>
          {status?.adminUrl && (
            <p className="mb-3">
              <a href={status.adminUrl} target="_blank" rel="noreferrer" className="text-info small">Netlify Admin 열기</a>
            </p>
          )}
          {published ? (
            <div className="p-3 rounded-3" style={{ backgroundColor: '#1e1e2d', border: '1px solid #3f3f5a' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-bold">Published Deploy</span>
                {stateBadge(published.state)}
              </div>
              <div className="small text-secondary">ID: {published.id}</div>
              <div className="small">Branch: {published.branch || '-'} · Commit: <code>{published.commitRef || '-'}</code></div>
              <div className="small text-truncate">{published.commitMessage || '-'}</div>
              <div className="small text-secondary mt-1">
                {published.createdAt ? new Date(published.createdAt).toLocaleString('ko-KR') : '-'}
              </div>
            </div>
          ) : (
            <div className="text-secondary">게시된 배포 정보가 없습니다.</div>
          )}

          <div className="d-flex flex-wrap align-items-center gap-3 mt-4">
            <Form.Check
              type="checkbox"
              id="netlify-clear-cache"
              label="Clear cache"
              checked={clearCache}
              onChange={(e) => setClearCache(e.target.checked)}
            />
            <Button variant="info" className="fw-bold" onClick={() => setAuthMode('deploy')}>
              Trigger Deploy
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
        <Card.Header className="fw-bold" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
          최근 배포
        </Card.Header>
        <Card.Body className="p-0">
          {deploys.length > 0 ? (
            <Table responsive variant="dark" hover className="mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr className="text-muted">
                  <th>상태</th>
                  <th>브랜치</th>
                  <th>커밋</th>
                  <th>메시지</th>
                  <th>시각</th>
                  <th className="text-center">동작</th>
                </tr>
              </thead>
              <tbody>
                {deploys.map((d) => (
                  <tr key={d.id}>
                    <td>{stateBadge(d.state)}</td>
                    <td>{d.branch || '-'}</td>
                    <td><code className="small">{d.commitRef ? String(d.commitRef).slice(0, 7) : '-'}</code></td>
                    <td className="text-truncate" style={{ maxWidth: 200 }} title={d.commitMessage || ''}>
                      {d.commitMessage || d.errorMessage || '-'}
                    </td>
                    <td className="text-secondary text-nowrap">
                      {d.createdAt ? new Date(d.createdAt).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="text-center text-nowrap">
                      {d.adminUrl && (
                        <Button
                          as="a"
                          href={d.adminUrl}
                          target="_blank"
                          rel="noreferrer"
                          variant="outline-secondary"
                          size="sm"
                          className="me-1 py-0 px-2"
                        >
                          로그
                        </Button>
                      )}
                      <Button
                        variant="outline-warning"
                        size="sm"
                        className="py-0 px-2"
                        onClick={() => {
                          setPendingDeployId(d.id);
                          setAuthMode('rollback');
                        }}
                      >
                        롤백
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-5">배포 목록이 없습니다.</div>
          )}
        </Card.Body>
      </Card>

      <DevExecutorAuthModal
        show={!!authMode}
        onHide={() => {
          setAuthMode(null);
          setPendingDeployId(null);
        }}
        title={authMode === 'rollback' ? 'Netlify 롤백' : 'Netlify 배포 트리거'}
        warning={
          authMode === 'rollback'
            ? `배포 ${pendingDeployId} 로 롤백합니다. Executor ID/PW를 입력하세요.`
            : '프로덕션 빌드를 트리거합니다. Executor ID/PW를 입력하세요.'
        }
        loading={authLoading}
        onConfirm={handleAuthConfirm}
      />
    </div>
  );
};

export default NetlifyDeployManager;
