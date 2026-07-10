import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Spinner, Row, Col, Table, Modal, Alert, Badge, Accordion } from 'react-bootstrap';
import { fetchDatabaseSchema, executeDbQuery } from '../api/devAuthApi';

const DatabaseManager = () => {
  const [schema, setSchema] = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(true);
  
  // Query Execution State
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authId, setAuthId] = useState('');
  const [authPw, setAuthPw] = useState('');

  useEffect(() => {
    loadSchema();
  }, []);

  const loadSchema = async () => {
    setLoadingSchema(true);
    const res = await fetchDatabaseSchema();
    if (res.success) {
      setSchema(res.data);
    }
    setLoadingSchema(false);
  };

  const handleExecuteQueryClick = () => {
    if (!query.trim()) {
      setQueryError('실행할 쿼리를 입력하세요.');
      return;
    }
    // 이차 인증 모달 띄우기
    setShowAuthModal(true);
    setQueryError('');
    setQueryResult(null);
  };

  const executeConfirmedQuery = async (e) => {
    e.preventDefault();
    if (!authId || !authPw) return;

    setQueryLoading(true);
    const res = await executeDbQuery(authId, authPw, query);
    
    if (res.success) {
      setQueryResult(res.data);
      setShowAuthModal(false);
      setAuthId('');
      setAuthPw('');
    } else {
      setQueryError(res.error);
      setShowAuthModal(false);
    }
    setQueryLoading(false);
  };

  return (
    <Row className="g-4">
      {/* Schema Viewer */}
      <Col md={3}>
        <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
          <Card.Header className="fw-bold" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
            Database Schema
            <Button variant="link" size="sm" className="float-end text-light p-0" onClick={loadSchema}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </Button>
          </Card.Header>
          <Card.Body style={{ overflowY: 'auto', maxHeight: '600px' }}>
            {loadingSchema ? (
              <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
            ) : schema.length > 0 ? (
              <Accordion flush>
                {schema.map((table, idx) => (
                  <Accordion.Item eventKey={idx.toString()} key={idx} style={{ backgroundColor: 'transparent' }}>
                    <Accordion.Header className="text-light">
                      <span className="fw-bold text-warning">{table.tableName}</span>
                    </Accordion.Header>
                    <Accordion.Body className="p-2" style={{ backgroundColor: '#1e1e2d' }}>
                      <Table size="sm" variant="dark" hover className="mb-0" style={{ fontSize: '0.8rem' }}>
                        <tbody>
                          {table.columns.map((col, cIdx) => (
                            <tr key={cIdx}>
                              <td>{col.Field}</td>
                              <td className="text-info">{col.Type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            ) : (
              <div className="text-secondary text-center">테이블이 없습니다.</div>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Query Executor */}
      <Col md={9}>
        <Card className="shadow-sm border-0 rounded-4 mb-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
          <Card.Body>
            <Card.Title className="fw-bold text-info mb-3">SQL Query Executor <Badge bg="danger" className="ms-2 fs-6">DANGER</Badge></Card.Title>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={5}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM Developer;"
                style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', border: '1px solid #3f3f5a', fontFamily: 'monospace' }}
              />
            </Form.Group>
            {queryError && <Alert variant="danger" className="py-2">{queryError}</Alert>}
            <div className="d-flex justify-content-end">
              <Button variant="danger" onClick={handleExecuteQueryClick} disabled={queryLoading}>
                {queryLoading ? <Spinner animation="border" size="sm" /> : 'Run Query'}
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* Query Results */}
        {queryResult && (
          <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#1e1e2d', border: '1px solid #3f3f5a' }}>
            <Card.Header className="fw-bold" style={{ backgroundColor: '#2b2b40', color: '#fff', borderBottom: '1px solid #3f3f5a' }}>
              Execution Result
              <Badge bg="success" className="ms-2">{queryResult.type}</Badge>
            </Card.Header>
            <Card.Body style={{ overflowX: 'auto', maxHeight: '400px' }}>
              {queryResult.type === 'UPDATE' ? (
                <div className="text-success fw-bold">Affected Rows: {queryResult.affectedRows}</div>
              ) : queryResult.data && queryResult.data.length > 0 ? (
                <Table striped bordered hover variant="dark" size="sm" style={{ whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr>
                      {Object.keys(queryResult.data[0]).map((key, i) => (
                        <th key={i}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.data.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j}>{val !== null ? val.toString() : 'NULL'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-secondary text-center">결과가 없습니다 (0 rows).</div>
              )}
            </Card.Body>
          </Card>
        )}
      </Col>

      {/* Secondary Auth Modal */}
      <Modal show={showAuthModal} onHide={() => setShowAuthModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#2b2b40', color: '#fff', borderBottom: '1px solid #3f3f5a' }}>
          <Modal.Title className="fw-bold text-danger">Secondary Authentication</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#1e1e2d', color: '#fff' }}>
          <Alert variant="warning" className="py-2 mb-4">쿼리 실행은 DB를 파괴할 수 있습니다. 2차 비밀번호를 입력하세요.</Alert>
          <Form onSubmit={executeConfirmedQuery}>
            <Form.Group className="mb-3">
              <Form.Label>Executor ID</Form.Label>
              <Form.Control
                type="text"
                value={authId}
                onChange={(e) => setAuthId(e.target.value)}
                required
                style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Executor PW</Form.Label>
              <Form.Control
                type="password"
                value={authPw}
                onChange={(e) => setAuthPw(e.target.value)}
                required
                style={{ backgroundColor: '#2b2b40', color: '#fff', border: '1px solid #3f3f5a' }}
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowAuthModal(false)}>취소</Button>
              <Button variant="danger" type="submit">인증 및 실행</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Row>
  );
};

export default DatabaseManager;
