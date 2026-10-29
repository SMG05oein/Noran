import React from 'react';
import { Card, Table, Button, Badge } from 'react-bootstrap';
import { RiHistoryLine } from 'react-icons/ri';
import PaginationBar from '../PaginationBar';
import { calculateTotalHours, formatDateStr, formatTimeStr } from './adminRecordsUtils';

const AdminRecordsTable = ({
  filteredRecords,
  page,
  totalPages,
  pageInput,
  setPage,
  setPageInput,
  sortBy,
  sortDir,
  onToggleSort,
  onOpenEditModal,
  onDeleteRecord
}) => {
  const sortIcon = (field) => {
    if (sortBy !== field) return '⇅';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  return (
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
      <Card.Body className="p-0">
        {filteredRecords.length === 0 ? (
          <div className="text-center text-muted py-5">
            <RiHistoryLine size={36} className="opacity-50 mb-2" />
            <p className="mb-0">해당 조건의 근무 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover className="custom-table align-middle mb-0 text-center">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>No.</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => onToggleSort('date')}>
                    날짜 {sortIcon('date')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => onToggleSort('workPlace')}>
                    지점 {sortIcon('workPlace')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => onToggleSort('userName')}>
                    직원 {sortIcon('userName')}
                  </th>
                  <th>출근</th>
                  <th>퇴근</th>
                  <th>휴게</th>
                  <th>총 근무</th>
                  <th>수정일시</th>
                  <th>메모</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, idx) => {
                  const totalHours = calculateTotalHours(r);
                  return (
                    <tr key={r.wrIdx}>
                      <td className="text-muted fw-semibold">{page * 10 + idx + 1}</td>
                      <td className="fw-bold text-dark">{formatDateStr(r.wrDate)}</td>
                      <td><Badge bg="light" className="text-dark border">{r.workPlaceName || '-'}</Badge></td>
                      <td>
                        <span className="fw-bold text-primary">{r.userName || `사원(${r.userIdx})`}</span>
                        {Number(r.nameSeq) > 1 && r.userIdx != null && (
                          <Badge bg="secondary" className="ms-1">#{r.userIdx}</Badge>
                        )}
                      </td>
                      <td>{formatTimeStr(r.wrStartTime)}</td>
                      <td>{formatTimeStr(r.wrEndTime)}</td>
                      <td>{formatTimeStr(r.wrRestTime)}</td>
                      <td className="fw-bold text-success">{totalHours.toFixed(1)}시간</td>
                      <td className="small text-muted">
                        {r.wrUpdatedAt
                          ? String(r.wrUpdatedAt).replace('T', ' ').slice(0, 16)
                          : '-'}
                      </td>
                      <td className="small text-muted text-truncate" style={{ maxWidth: '140px' }}>{r.wrRemarks || '-'}</td>
                      <td>
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <Button size="sm" variant="outline-primary" className="rounded-pill fw-bold px-3" onClick={() => onOpenEditModal(r)}>
                            수정
                          </Button>
                          <Button size="sm" variant="outline-danger" className="rounded-pill fw-bold px-3" onClick={() => onDeleteRecord(r.wrIdx)}>
                            삭제
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
  );
};

export default AdminRecordsTable;

