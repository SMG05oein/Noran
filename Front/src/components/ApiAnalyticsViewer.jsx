import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Spinner, ProgressBar, Form, Row, Col } from 'react-bootstrap';
import { fetchApiAnalytics, fetchSlowEndpoints, fetchStatusBreakdown } from '../api/devAuthApi';

const HOUR_OPTIONS = [
  { value: '', label: '전체(누적)' },
  { value: '1', label: '최근 1시간' },
  { value: '6', label: '최근 6시간' },
  { value: '24', label: '최근 24시간' },
  { value: '168', label: '최근 7일' },
];

const ApiAnalyticsViewer = () => {
  const [hours, setHours] = useState('24');
  const [analytics, setAnalytics] = useState([]);
  const [slow, setSlow] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const hoursParam = hours === '' ? undefined : Number(hours);
    const windowHours = hoursParam ?? 24;

    const [topRes, slowRes, statusRes] = await Promise.all([
      fetchApiAnalytics({ hours: hoursParam, limit: 10 }),
      fetchSlowEndpoints({ hours: windowHours, limit: 10 }),
      fetchStatusBreakdown(windowHours),
    ]);

    setAnalytics(topRes.success && Array.isArray(topRes.data) ? topRes.data : []);
    setSlow(slowRes.success && Array.isArray(slowRes.data) ? slowRes.data : []);
    setBreakdown(statusRes.success ? statusRes.data : null);
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [hours]);

  const getMethodBadge = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return <Badge bg="success">GET</Badge>;
      case 'POST':
        return <Badge bg="primary">POST</Badge>;
      case 'PUT':
        return <Badge bg="warning" text="dark">PUT</Badge>;
      case 'DELETE':
        return <Badge bg="danger">DELETE</Badge>;
      default:
        return <Badge bg="secondary">{method}</Badge>;
    }
  };

  const maxCount = analytics.length > 0 ? Math.max(...analytics.map((a) => a.count || 1)) : 1;

  return (
    <div className="d-flex flex-column gap-4">
      <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
        <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-3 py-3">
          <span className="fw-bold" style={{ color: '#00d2ff' }}>조회 기간</span>
          <div className="d-flex align-items-center gap-2">
            <Form.Select
              size="sm"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              style={{ width: '160px', backgroundColor: '#1e1e2d', color: '#fff', border: '1px solid #3f3f5a' }}
            >
              {HOUR_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </Form.Select>
            <Button variant="outline-info" size="sm" onClick={loadAnalytics} disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : '새로고침'}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {breakdown && (
        <Row className="g-3">
          {['2xx', '3xx', '4xx', '5xx', '429', 'total'].map((key) => (
            <Col key={key} xs={6} md={2}>
              <Card className="shadow-sm border-0 rounded-3 text-center" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
                <Card.Body className="py-3">
                  <div className="small text-secondary mb-1">{key}</div>
                  <div className="fw-bold fs-5 text-info">{breakdown[key] ?? 0}</div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
        <Card.Header className="fw-bold" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
          API 호출 통계 Top 10 {hours === '' ? '(누적)' : `(${hours}h)`}
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="info" /></div>
          ) : analytics.length > 0 ? (
            <div className="table-responsive hide-scrollbar">
              <Table responsive variant="dark" hover className="mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
                <thead style={{ backgroundColor: '#1e1e2d' }}>
                  <tr className="text-muted">
                    <th style={{ width: '60px' }} className="text-center">순위</th>
                    <th style={{ width: '90px' }}>메소드</th>
                    <th>API 경로 (Path)</th>
                    <th style={{ width: '180px' }}>호출 횟수</th>
                    <th style={{ width: '130px' }} className="text-end">평균 응답시간</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-center fw-bold text-info">#{idx + 1}</td>
                      <td>{getMethodBadge(item.method)}</td>
                      <td className="fw-bold text-light">{item.path}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <ProgressBar
                            now={(item.count / maxCount) * 100}
                            variant="info"
                            style={{ height: '8px', flex: 1, backgroundColor: '#3f3f5a' }}
                          />
                          <span className="fw-semibold small" style={{ width: '45px' }}>{item.count}회</span>
                        </div>
                      </td>
                      <td className="text-end fw-bold">
                        <span className={item.avgResponseTimeMs > 500 ? 'text-danger' : item.avgResponseTimeMs > 100 ? 'text-warning' : 'text-success'}>
                          {typeof item.avgResponseTimeMs === 'number' ? item.avgResponseTimeMs.toFixed(2) : item.avgResponseTimeMs} ms
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted py-5">수집된 API 통계 데이터가 없습니다.</div>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
        <Card.Header className="fw-bold" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
          느린 엔드포인트 Top 10
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4"><Spinner animation="border" size="sm" variant="info" /></div>
          ) : slow.length > 0 ? (
            <Table responsive variant="dark" hover className="mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr className="text-muted">
                  <th style={{ width: '60px' }} className="text-center">순위</th>
                  <th style={{ width: '90px' }}>메소드</th>
                  <th>경로</th>
                  <th className="text-end">호출</th>
                  <th className="text-end">평균</th>
                  <th className="text-end">최대</th>
                </tr>
              </thead>
              <tbody>
                {slow.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-center text-info fw-bold">#{idx + 1}</td>
                    <td>{getMethodBadge(item.method)}</td>
                    <td>{item.path}</td>
                    <td className="text-end">{item.count}</td>
                    <td className="text-end text-warning">
                      {typeof item.avgResponseTimeMs === 'number' ? item.avgResponseTimeMs.toFixed(2) : item.avgResponseTimeMs} ms
                    </td>
                    <td className="text-end text-danger">
                      {item.maxResponseTimeMs != null ? `${item.maxResponseTimeMs} ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-4">느린 엔드포인트 데이터가 없습니다.</div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ApiAnalyticsViewer;
