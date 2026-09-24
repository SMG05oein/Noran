import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Card, Button, Form, Spinner, Row, Col, Table, Alert, Badge, Accordion } from 'react-bootstrap';
import { fetchDatabaseSchema, executeDbQuery, fetchDatabaseAudit } from '../api/devAuthApi';
import DevExecutorAuthModal from './DevExecutorAuthModal';

const Editor = lazy(() => import('@monaco-editor/react'));

const DANGEROUS_RE = /\b(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+)\b/i;

const DatabaseManager = () => {
  const [schema, setSchema] = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const schemaRef = useRef([]);

  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [readOnly, setReadOnly] = useState(true);
  const [confirmDangerous, setConfirmDangerous] = useState(false);
  const [auditRows, setAuditRows] = useState([]);

  const providerRef = useRef(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    loadSchema();
    loadAudit();
    return () => {
      if (providerRef.current) providerRef.current.dispose();
    };
  }, []);

  const loadSchema = async () => {
    setLoadingSchema(true);
    const res = await fetchDatabaseSchema();
    if (res.success) setSchema(res.data);
    setLoadingSchema(false);
  };

  const loadAudit = async () => {
    const res = await fetchDatabaseAudit(50);
    if (res.success) setAuditRows(Array.isArray(res.data) ? res.data : []);
  };

  const isDangerous = DANGEROUS_RE.test(query || '');

  const handleExecuteQueryClick = () => {
    if (!query.trim()) {
      setQueryError('실행할 쿼리를 입력하세요.');
      return;
    }
    if (!readOnly && isDangerous && !confirmDangerous) {
      setQueryError('위험한 SQL입니다. "위험 SQL 확인" 체크 후 실행하세요.');
      return;
    }
    setShowAuthModal(true);
    setQueryError('');
    setQueryResult(null);
  };

  const executeConfirmedQuery = async (authId, authPw) => {
    setQueryLoading(true);
    const res = await executeDbQuery(authId, authPw, query, {
      readOnly,
      confirmDangerous: !readOnly && confirmDangerous,
    });

    if (res.success) {
      setQueryResult(res.data);
      setShowAuthModal(false);
      loadAudit();
    } else {
      setQueryError(res.error);
      setShowAuthModal(false);
    }
    setQueryLoading(false);
  };

  const handleEditorDidMount = (editor, monaco) => {
    if (providerRef.current) providerRef.current.dispose();

    providerRef.current = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions = [];
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'SET',
          'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'JOIN', 'INNER',
          'LEFT', 'RIGHT', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'ORDER BY',
          'GROUP BY', 'HAVING', 'LIMIT', 'ASC', 'DESC', 'VALUES', 'AS', 'EXPLAIN', 'SHOW', 'DESCRIBE',
        ];

        keywords.forEach((kw) => {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            detail: 'Keyword',
            range,
          });
        });

        schemaRef.current.forEach((table) => {
          suggestions.push({
            label: table.tableName,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.tableName,
            detail: 'Table',
            range,
          });
          table.columns.forEach((col) => {
            suggestions.push({
              label: col.Field,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col.Field,
              detail: `Column in ${table.tableName} (${col.Type})`,
              range,
            });
          });
        });

        return { suggestions };
      },
    });
  };

  return (
    <>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Row className="g-4">
        <Col md={5}>
          <Card className="shadow-sm border-0 h-100 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
            <Card.Header className="fw-bold" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
              Database Schema
              <Button variant="link" size="sm" className="float-end text-light p-0" onClick={loadSchema}>
                Refresh
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

        <Col md={7}>
          <Card className="shadow-sm border-0 rounded-4 mb-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
            <Card.Body>
              <Card.Title className="fw-bold text-info mb-3">
                SQL Query Executor
                {readOnly ? (
                  <Badge bg="success" className="ms-2 fs-6">READ ONLY</Badge>
                ) : (
                  <Badge bg="danger" className="ms-2 fs-6">WRITE</Badge>
                )}
              </Card.Title>

              <div className="d-flex flex-wrap gap-3 mb-3">
                <Form.Check
                  type="switch"
                  id="sql-readonly"
                  label="읽기 전용 (SELECT만)"
                  checked={readOnly}
                  onChange={(e) => {
                    setReadOnly(e.target.checked);
                    if (e.target.checked) setConfirmDangerous(false);
                  }}
                />
                {!readOnly && (
                  <Form.Check
                    type="checkbox"
                    id="sql-dangerous"
                    label="위험 SQL 확인 (DROP/TRUNCATE/UPDATE 등)"
                    checked={confirmDangerous}
                    onChange={(e) => setConfirmDangerous(e.target.checked)}
                    className="text-warning"
                  />
                )}
              </div>

              {!readOnly && isDangerous && (
                <Alert variant="danger" className="py-2">위험한 SQL 패턴이 감지되었습니다. confirmDangerous 체크가 필요합니다.</Alert>
              )}

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
                      suggestOnTriggerCharacters: true,
                    }}
                  />
                </Suspense>
              </div>
              {queryError && <Alert variant="danger" className="py-2">{queryError}</Alert>}
              <div className="d-flex justify-content-end">
                <Button variant={readOnly ? 'info' : 'danger'} onClick={handleExecuteQueryClick} disabled={queryLoading}>
                  {queryLoading ? <Spinner animation="border" size="sm" /> : 'Run Query'}
                </Button>
              </div>
            </Card.Body>
          </Card>

          {queryResult && (
            <Card className="shadow-sm border-0 rounded-4 mb-4" style={{ backgroundColor: '#1e1e2d', border: '1px solid #3f3f5a' }}>
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

          <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
            <Card.Header
              className="fw-bold d-flex justify-content-between align-items-center"
              style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}
            >
              <span>SQL 감사 로그</span>
              <Button variant="outline-info" size="sm" onClick={loadAudit}>새로고침</Button>
            </Card.Header>
            <Card.Body className="p-0" style={{ maxHeight: '240px', overflow: 'auto' }}>
              {auditRows.length > 0 ? (
                <Table size="sm" variant="dark" hover className="mb-0 align-middle" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr className="text-muted">
                      <th>시각</th>
                      <th>Executor</th>
                      <th>Type</th>
                      <th>SQL</th>
                      <th>결과</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map((row) => (
                      <tr key={row.id}>
                        <td className="text-secondary text-nowrap">{row.timestamp ? new Date(row.timestamp).toLocaleString('ko-KR') : '-'}</td>
                        <td>{row.executorId}</td>
                        <td>{row.type}</td>
                        <td className="text-truncate" style={{ maxWidth: 220 }} title={row.sqlPreview}>{row.sqlPreview}</td>
                        <td>{row.success ? <Badge bg="success">OK</Badge> : <Badge bg="danger">FAIL</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center text-secondary py-4">감사 기록이 없습니다.</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <DevExecutorAuthModal
        show={showAuthModal}
        onHide={() => setShowAuthModal(false)}
        warning={readOnly ? '읽기 전용 쿼리를 실행합니다. Executor ID/PW를 입력하세요.' : '쓰기 쿼리는 DB를 변경할 수 있습니다. Executor ID/PW를 입력하세요.'}
        loading={queryLoading}
        onConfirm={executeConfirmedQuery}
      />
    </>
  );
};

export default DatabaseManager;
