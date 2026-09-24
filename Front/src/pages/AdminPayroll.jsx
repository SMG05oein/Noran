import { useState, useEffect, useMemo } from 'react';
import { Container, Card, Table, Button, Form, Badge } from 'react-bootstrap';
import { fetchPayrollList, downloadPayrollExcel } from '../api/payrollApi';
import { fetchWorkPlaces, fetchUserTypes } from '../api/authApi';
import { format } from 'date-fns';
import { RiSearchLine, RiDownload2Line, RiMoneyDollarCircleLine } from 'react-icons/ri';
import PaginationBar from '../components/PaginationBar';
import Loading from '../components/Loading';
import useAuthStore from '../store/useAuthStore';
import './AdminMain.css';

const AdminPayroll = () => {
  const { user: me } = useAuthStore();
  const [selectedWpIdx, setSelectedWpIdx] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [payrollRows, setPayrollRows] = useState([]);
  const [branches, setBranches] = useState([{ wpIdx: null, wpName: '전체' }]);
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const myRole = useMemo(
    () => userTypes.find((t) => Number(t.utIdx) === Number(me?.fkUtIdx)),
    [userTypes, me?.fkUtIdx]
  );
  const canViewSensitive = myRole?.utCanViewSensitive === 1;
  const canExportExcel = myRole?.utCanExportExcel === 1;

  const loadBranchesAndRoles = async () => {
    const [branchRes, typeRes] = await Promise.all([fetchWorkPlaces(), fetchUserTypes()]);
    if (branchRes.success && branchRes.data) {
      setBranches([{ wpIdx: null, wpName: '전체' }, ...branchRes.data]);
    }
    if (typeRes.success && typeRes.data) {
      setUserTypes(typeRes.data);
    }
  };

  const loadData = async () => {
    setLoading(true);
    let year = null;
    let month = null;
    if (selectedMonth) {
      const [yStr, mStr] = selectedMonth.split('-');
      year = parseInt(yStr, 10);
      month = parseInt(mStr, 10);
    }

    const params = {
      page,
      size: 10,
      sortBy: sortBy || undefined,
      sortDir: sortBy ? sortDir : undefined,
      userName: searchTerm || undefined,
      workPlaceIdx: selectedWpIdx || undefined,
      year: year || undefined,
      month: month || undefined,
    };

    const res = await fetchPayrollList(params);
    if (res.success) {
      setPayrollRows(res.data.content || res.data || []);
      setTotalPages(res.data.totalPages || 1);
    } else {
      setPayrollRows([]);
      setTotalPages(1);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBranchesAndRoles();
  }, []);

  useEffect(() => {
    loadData();
    setPageInput((page + 1).toString());
  }, [page, sortBy, sortDir, searchTerm, selectedWpIdx, selectedMonth]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(0);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortBy('');
        setSortDir('asc');
      }
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
    setPageInput('1');
  };

  const sortIcon = (field) => {
    if (sortBy !== field) return '⇅';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  const formatMoney = (value) => {
    if (!canViewSensitive) return '***';
    if (value == null) return '-';
    return `${Number(value).toLocaleString()}원`;
  };

  const formatHours = (value) => {
    if (value == null) return '-';
    return `${Number(value)}시간`;
  };

  const handleDownloadExcel = async () => {
    if (!selectedMonth) return;
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const workPlaceIdx = selectedWpIdx || null;

    setDownloading(true);
    const res = await downloadPayrollExcel(year, month, workPlaceIdx);
    setDownloading(false);
    if (!res.success) {
      alert(res.error || '엑셀 다운로드에 실패했습니다.');
    }
  };

  return (
    <div className="admin-container">
      <Container className="py-4 py-md-5">
        <div className="admin-header-card">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h2 className="fw-bold text-dark mb-1">급여 관리</h2>
              <p className="text-muted small mb-0">월별 직원 급여(시급·총근무시간·세전)를 조회하고 엑셀로 다운로드합니다.</p>
            </div>

            {canExportExcel && (
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="success"
                  className="fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2 shadow-xs"
                  onClick={handleDownloadExcel}
                  disabled={downloading}
                >
                  <RiDownload2Line size={16} />
                  {downloading ? '다운로드 중...' : '엑셀 다운로드'}
                </Button>
              </div>
            )}
          </div>

          <hr className="my-3 opacity-25" />

          <div className="d-flex gap-2 align-items-center flex-wrap w-100">
            <div className="branch-select-pills mb-0">
              {branches.map((b) => (
                <button
                  key={b.wpIdx ?? 'all'}
                  type="button"
                  className={`branch-pill ${selectedWpIdx === b.wpIdx ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedWpIdx(b.wpIdx);
                    setPage(0);
                    setPageInput('1');
                  }}
                >
                  {b.wpName}
                </button>
              ))}
            </div>

            <Form.Control
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(0);
                setPageInput('1');
              }}
              className="custom-input py-2 fw-bold text-primary"
              style={{ width: '160px' }}
            />

            <Form
              onSubmit={handleSearch}
              className="d-flex align-items-center gap-1 ms-md-auto"
              style={{ minWidth: '220px', maxWidth: '320px' }}
            >
              <Form.Control
                type="text"
                placeholder="직원 이름 검색"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="custom-input py-2"
              />
              <Button
                type="submit"
                variant="primary"
                className="fw-bold d-flex align-items-center gap-1 rounded-3 px-3 py-2 text-nowrap"
              >
                <RiSearchLine size={16} /> 검색
              </Button>
            </Form>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Body className="p-0">
              {payrollRows.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <RiMoneyDollarCircleLine size={36} className="opacity-50 mb-2" />
                  <p className="mb-0">해당 조건의 급여 데이터가 없습니다.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="custom-table align-middle mb-0 text-center">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>No.</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('workPlace')}>
                          소속 {sortIcon('workPlace')}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('userName')}>
                          이름 {sortIcon('userName')}
                        </th>
                        <th>아이디</th>
                        <th>연락처</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('hourlyWage')}>
                          시급 {sortIcon('hourlyWage')}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('totalHours')}>
                          총근무시간 {sortIcon('totalHours')}
                        </th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('preTaxPay')}>
                          세전급여 {sortIcon('preTaxPay')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRows.map((r, idx) => (
                        <tr key={`${r.userIdx}-${r.workPlaceName || ''}-${idx}`}>
                          <td className="text-muted fw-semibold">{page * 10 + idx + 1}</td>
                          <td>
                            <Badge bg="light" className="text-dark border">
                              {r.workPlaceName || '-'}
                            </Badge>
                          </td>
                          <td>
                            <span className="fw-bold text-primary">
                              {r.userName || `사원(${r.userIdx})`}
                            </span>
                            {Number(r.nameSeq) > 1 && r.userIdx != null && (
                              <Badge bg="secondary" className="ms-1">
                                #{r.userIdx}
                              </Badge>
                            )}
                          </td>
                          <td className="text-muted small">{r.userId || '-'}</td>
                          <td className="small">{r.userPhone || '-'}</td>
                          <td className="small">{formatMoney(r.hourlyWage)}</td>
                          <td className="fw-bold text-success">{formatHours(r.totalHours)}</td>
                          <td className="fw-bold">{formatMoney(r.preTaxPay)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
              <div className="p-3 border-top">
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  pageInput={pageInput}
                  setPage={setPage}
                  setPageInput={setPageInput}
                />
              </div>
            </Card.Body>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default AdminPayroll;
