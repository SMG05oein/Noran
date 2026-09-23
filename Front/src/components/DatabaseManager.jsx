import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Card, Button, Form, Spinner, Row, Col, Table, Modal, Alert, Badge, Accordion } from 'react-bootstrap';
import { fetchDatabaseSchema, executeDbQuery } from '../api/devAuthApi';

const Editor = lazy(() => import('@monaco-editor/react'));

const DatabaseManager = () => {
  const [schema, setSchema] = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const schemaRef = useRef([]);
  
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  // Query Execution State
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);

  // Editor Provider Ref
  const providerRef = useRef(null);
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authId, setAuthId] = useState('');
  const [authPw, setAuthPw] = useState('');

  useEffect(() => {
    loadSchema();
    return () => {
      if (providerRef.current) {
        providerRef.current.dispose();
      }
    };
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

  const handleEditorDidMount = (editor, monaco) => {
    if (providerRef.current) {
      providerRef.current.dispose();
    }
    
    // DB 테이블 및 컬럼명을 위한 커스텀 자동완성(Provider) 등록
    providerRef.current = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        const suggestions = [];
        
        // 1. 기본 SQL 키워드 추가
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'SET', 
          'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'JOIN', 'INNER', 
          'LEFT', 'RIGHT', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'ORDER BY', 
          'GROUP BY', 'HAVING', 'LIMIT', 'ASC', 'DESC', 'VALUES', 'AS'
        ];
        
        keywords.forEach(kw => {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            detail: 'Keyword',
            range: range
          });
        });

        // 2. DB 테이블 및 컬럼명 추가
        schemaRef.current.forEach(table => {
          suggestions.push({
            label: table.tableName,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.tableName,
            detail: 'Table',
            range: range
          });
          
          table.columns.forEach(col => {
            suggestions.push({
              label: col.Field,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col.Field,
              detail: `Column in ${table.tableName} (${col.Type})`,
              range: range
            });
          });
        });

        return { suggestions };
      }
    });
  };

  return (
    <>
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      <Row className="g-4">
      {/* Schema Viewer */}
      <Col md={5}>
        <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
          <Card.Header className="fw-bold" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
            Database Schema
            <Button variant="link" size="sm" className="float-end text-light p-0" onClick={loadSchema}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </Button>
          </Card.Header>
          <Card.Body className="hide-scrollbar" style={{ overflowY: 'auto', maxHeight: '600px' }}>
            {loadingSchema ? (
              <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
            ) : schema.length > 0 ? (
              <Accordion flush>
                {schema.map((table, idx) => (
                  <Accordion.Item eventKey={idx.toString()} key={idx} style={{ backgroundColor: 'transparent' }}>
                    <Accordion.Header className="text-light">
                      <span className="fw-bold text-warning">{table.tableName}</span>
                    </Accordion.Header>
                    <Accordion.Body className="p-0" style={{ backgroundColor: '#1e1e2d' }}>
                      <div className="table-responsive hide-scrollbar">
                      <Table size="sm" variant="dark" hover className="mb-0 text-center align-middle" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        <thead>
                          <tr className="text-muted">
                            <th className="text-start">Field</th>
                            <th>Type</th>
                            <th>Null</th>
                            <th>Key</th>
                            <th>Default</th>
                            <th>Extra</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map((col, cIdx) => (
                            <tr key={cIdx}>
                              <td className="text-start fw-bold">{col.Field}</td>
                              <td className="text-info">{col.Type}</td>
                              <td>
                                {col.Null === 'YES' ? <span className="text-secondary">YES</span> : <Badge bg="danger" style={{ fontSize: '0.7rem' }}>NN</Badge>}
                              </td>
                              <td>
                                {col.Key === 'PRI' && <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem' }}>PK</Badge>}
                                {col.Key === 'UNI' && <Badge bg="primary" style={{ fontSize: '0.7rem' }}>UNI</Badge>}
                                {col.Key === 'MUL' && <Badge bg="info" text="dark" style={{ fontSize: '0.7rem' }}>MUL</Badge>}
                              </td>
                              <td className="text-secondary">{col.Default !== null ? col.Default : '-'}</td>
                              <td className="text-muted small">{col.Extra}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      </div>
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
      <Col md={7}>
        <Card className="shadow-sm border-0 rounded-4 mb-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
          <Card.Body>
            <Card.Title className="fw-bold text-info mb-3">SQL Query Executor <Badge bg="danger" className="ms-2 fs-6">DANGER</Badge></Card.Title>
            <div className="mb-3 rounded" style={{ border: '1px solid #3f3f5a', overflow: 'hidden' }}>
              <Suspense fallback={<div className="d-flex justify-content-center py-5"><Spinner animation="border" variant="info" /></div>}>
                <Editor
                  height="200px"
                  defaultLanguage="sql"
                  theme="vs-dark"
                  value={query}
                  onChange={(value) => setQuery(value || '')}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    quickSuggestions: true,
                    suggestOnTriggerCharacters: true
                  }}
                />
              </Suspense>
            </div>
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
            <Card.Body className="hide-scrollbar" style={{ overflowX: 'auto', maxHeight: '400px' }}>
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
    </>
  );
};

export default DatabaseManager;
