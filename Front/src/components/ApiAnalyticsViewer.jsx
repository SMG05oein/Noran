import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Spinner, ProgressBar } from 'react-bootstrap';
import { fetchApiAnalytics } from '../api/devAuthApi';

const ApiAnalyticsViewer = () => {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const res = await fetchApiAnalytics();
    if (res.success && Array.isArray(res.data)) {
      setAnalytics(res.data);
    } else {
      setAnalytics([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

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
    <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
      <Card.Header className="d-flex justify-content-between align-items-center" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
        <span className="fw-bold">API 호출 통계 Top 10</span>
        <Button variant="outline-info" size="sm" onClick={loadAnalytics} disabled={loading}>
          {loading ? <Spinner animation="border" size="sm" /> : '새로고침'}
        </Button>
      </Card.Header>
      <Card.Body className="p-0">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="info" />
          </div>
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
  );
};

export default ApiAnalyticsViewer;
