import { useState, useMemo } from 'react';
import { Modal, Table, Button, Form, Badge, Spinner } from 'react-bootstrap';
import { RiAlertLine, RiSearchLine, RiRefreshLine, RiPhoneLine, RiCalendarLine, RiStore2Line, RiTimeLine } from 'react-icons/ri';

const AdminUnrecordedModal = ({
  show,
  onHide,
  unrecordedList = [],
  loading = false,
  onRefresh,
  selectedMonth,
  selectedBranchName = '전체'
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) {
      return [...unrecordedList].sort((a, b) => (b.workDate || '').localeCompare(a.workDate || ''));
    }
    const term = searchTerm.trim().toLowerCase();
    return unrecordedList
      .filter((item) => {
        const name = (item.userName || '').toLowerCase();
        const phone = (item.userPhone || '').toLowerCase();
        const place = (item.workPlaceName || '').toLowerCase();
        const date = (item.workDate || '').toLowerCase();
        return name.includes(term) || phone.includes(term) || place.includes(term) || date.includes(term);
      })
      .sort((a, b) => (b.workDate || '').localeCompare(a.workDate || ''));
  }, [unrecordedList, searchTerm]);

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return '';
    const [y, m] = selectedMonth.split('-');
    return `${y}년 ${parseInt(m, 10)}월`;
  }, [selectedMonth]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="unrecorded-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2 fs-5">
            <span className="p-2 rounded-circle bg-danger-subtle text-danger d-inline-flex">
              <RiAlertLine size={20} />
            </span>
            <span>근무 기록 미작성 알바생</span>
          </Modal.Title>
          <Badge bg="danger" pill className="px-2 py-1 fs-6">
            {unrecordedList.length}건
          </Badge>
          <span className="text-muted small">
            ({monthLabel} · {selectedBranchName})
          </span>
        </div>
      </Modal.Header>

      <Modal.Body className="pt-3">
        <div className="bg-light rounded-3 p-3 mb-3 border">
          <div className="small text-muted mb-2">
            배정일자 기준 당일 23:59까지 출퇴근 기록을 작성하지 않은 알바생 목록입니다. (오늘 이후 배정건은 제외)
          </div>
          <div className="d-flex gap-2 align-items-center">
            <div className="position-relative flex-grow-1">
              <RiSearchLine
                size={16}
                className="position-absolute text-muted"
                style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }}
              />
              <Form.Control
                type="text"
                placeholder="이름, 연락처, 지점 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="custom-input ps-4 py-2"
                style={{ paddingLeft: '36px' }}
              />
            </div>
            {onRefresh && (
              <Button
                variant="outline-secondary"
                className="d-flex align-items-center gap-1 py-2 px-3 text-nowrap rounded-3"
                onClick={onRefresh}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : <RiRefreshLine size={16} />}
                <span>새로고침</span>
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="danger" />
            <p className="text-muted small mt-2 mb-0">미작성 알바생 목록을 불러오는 중입니다...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div className="mb-2 fs-2 text-success">✓</div>
            <div className="fw-bold fs-6 text-dark mb-1">
              {searchTerm ? '검색 결과가 없습니다.' : '기한 지난 미작성 알바생이 없습니다!'}
            </div>
            <div className="small">모든 배정 근무 기록이 정상적으로 작성되었습니다.</div>
          </div>
        ) : (
          <div className="table-responsive rounded-3 border" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <Table hover align="middle" className="mb-0 text-center text-nowrap">
              <thead className="table-light sticky-top">
                <tr>
                  <th style={{ width: '120px' }}>
                    <span className="d-inline-flex align-items-center gap-1">
                      <RiCalendarLine size={14} /> 배정일자
                    </span>
                  </th>
                  <th>
                    <span className="d-inline-flex align-items-center gap-1">
                      <RiStore2Line size={14} /> 지점
                    </span>
                  </th>
                  <th>이름</th>
                  <th>
                    <span className="d-inline-flex align-items-center gap-1">
                      <RiTimeLine size={14} /> 배정시간
                    </span>
                  </th>
                  <th>
                    <span className="d-inline-flex align-items-center gap-1">
                      <RiPhoneLine size={14} /> 연락처
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => (
                  <tr key={item.wsdIdx || `${item.userIdx}-${item.workDate}-${idx}`}>
                    <td className="fw-bold text-dark">{item.workDate || '-'}</td>
                    <td>
                      <Badge bg="light" text="dark" className="border px-2 py-1">
                        {item.workPlaceName || '-'}
                      </Badge>
                    </td>
                    <td className="fw-bold text-primary">
                      {item.userName || '-'}
                      {item.isConfirmed === false && (
                        <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.7rem' }}>
                          미확정
                        </Badge>
                      )}
                    </td>
                    <td>
                      <span className="fw-semibold">{item.startTime || '-'}</span>
                      {item.isOpen && (
                        <Badge bg="info" className="ms-1" style={{ fontSize: '0.7rem' }}>
                          오픈
                        </Badge>
                      )}
                      {item.isClose && (
                        <Badge bg="dark" className="ms-1" style={{ fontSize: '0.7rem' }}>
                          마감
                        </Badge>
                      )}
                    </td>
                    <td>
                      {item.userPhone ? (
                        <a
                          href={`tel:${item.userPhone}`}
                          className="text-decoration-none fw-semibold text-secondary d-inline-flex align-items-center gap-1"
                        >
                          <RiPhoneLine size={14} />
                          {item.userPhone}
                        </a>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0">
        <Button variant="secondary" onClick={onHide} className="rounded-pill px-4">
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AdminUnrecordedModal;
