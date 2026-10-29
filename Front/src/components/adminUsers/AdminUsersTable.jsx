import React from 'react';
import { Card, Table, Form, Badge, Button } from 'react-bootstrap';

const AdminUsersTable = ({
  isAllSelected,
  toggleSelectAll,
  handleSort,
  renderSortIcon,
  selectedRole,
  bankColsVisible,
  activeStatus,
  users,
  selectedUserIdxs,
  toggleSelectUser,
  page,
  openEditModal,
  resolveBankLabel,
  resolveAccountCell,
  copyUserId,
  canViewSensitive,
  isArchivedMode,
  restoreArchivedUser,
  deleteArchivedUser,
  loadUsers,
  handleHardDelete
}) => {
  return (
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="custom-table align-middle mb-0 text-center">
            <thead className="table-light">
              <tr>
                <th style={{ width: '40px' }}>
                  <Form.Check type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} />
                </th>
                <th>No.</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('branch')}>
                  소속 {renderSortIcon('branch')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('name')}>
                  이름 {renderSortIcon('name')}
                </th>
                {selectedRole === '전체' && <th>역할</th>}
                {bankColsVisible && (
                  <>
                    <th>은행</th>
                    <th>계좌</th>
                  </>
                )}
                <th>아이디</th>
                <th>시급</th>
                <th>연락처</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                  상태 {renderSortIcon('status')}
                </th>
                {activeStatus === 'INACTIVE' && <th>퇴사일</th>}
                {activeStatus !== 'ACTIVE' && activeStatus !== 'LEAVE' && <th>삭제</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.userIdx} className={u.userIsActive === 0 ? 'table-secondary text-muted' : u.userIsActive === 2 ? 'table-leave text-muted' : ''}>
                  <td>
                    <Form.Check type="checkbox" checked={selectedUserIdxs.has(u.userIdx)} onChange={() => toggleSelectUser(u.userIdx)} disabled={u.userIsActive === 0} title={u.userIsActive === 0 ? '퇴사자는 일괄 수정할 수 없습니다.' : ''} />
                  </td>
                  <td className="fw-bold text-muted">{page * 10 + idx + 1}</td>
                  <td className="fw-bold">{u.workPlaceName || '-'}</td>
                  <td className="fw-bold">
                    <span
                      className={u.userIsActive === 0 ? "text-secondary" : "text-primary"}
                      style={{ cursor: u.userIsActive === 0 ? 'not-allowed' : 'pointer', textDecoration: u.userIsActive === 0 ? 'none' : 'underline' }}
                      onClick={() => openEditModal(u)}
                      title={u.userIsActive === 0 ? "퇴사자의 정보는 수정할 수 없습니다." : "클릭하여 상세 조회 및 수정"}
                    >
                      {u.userName}
                      {Number(u.nameSeq) > 1 && u.userIdx != null && (
                        <Badge bg="secondary" className="ms-1">#{u.userIdx}</Badge>
                      )}
                    </span>
                  </td>
                  {selectedRole === '전체' && (
                    <td>
                      {(u.isAdmin === 1 || u.role === 'ADMIN' || u.userRole === 'ADMIN') ? <Badge bg="danger">관리자</Badge> : <Badge bg="info">알바생</Badge>}
                    </td>
                  )}
                  {bankColsVisible && (
                    <>
                      <td className="small">{resolveBankLabel(u)}</td>
                      <td className="small font-monospace">{resolveAccountCell(u)}</td>
                    </>
                  )}
                  <td
                    className="text-muted small"
                    style={{ cursor: 'pointer' }}
                    title="클릭하여 복사"
                    onClick={() => copyUserId(u.userId)}
                  >
                    {u.userId}
                  </td>
                  <td className="small">{canViewSensitive && u.userHourlyWage ? `${u.userHourlyWage.toLocaleString()}원` : (canViewSensitive ? '-' : '***')}</td>
                  <td className="small">{u.userPhone || '-'}</td>
                  <td>
                    {u.userIsActive === 1 ? <Badge bg="success">재직</Badge> : u.userIsActive === 2 ? <Badge bg="warning">휴직</Badge> : <Badge bg="dark">퇴사</Badge>}
                  </td>
                  {activeStatus === 'INACTIVE' && (
                    <td className="small text-danger">
                      {u.userWithdrawnAt ? u.userWithdrawnAt.split('T')[0] : '-'}
                    </td>
                  )}
                  {activeStatus !== 'ACTIVE' && activeStatus !== 'LEAVE' && (
                    <td>
                      <div className="d-flex justify-content-center gap-1">
                        {isArchivedMode ? (
                          <>
                            <Button size="sm" variant="success" onClick={async () => {
                              if (!window.confirm(`[${u.userName}]님을 활성 상태로 복구하시겠습니까?`)) return;
                              const res = await restoreArchivedUser(u.userIdx);
                              if (res.success) { loadUsers(); } else alert(res.error || '복구 실패');
                            }}>복구</Button>
                            <Button size="sm" variant="danger" onClick={async () => {
                              if (!window.confirm(`[경고] [${u.userName}]님의 데이터를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 데이터가 영구 파기됩니다.`)) return;
                              const res = await deleteArchivedUser(u.userIdx);
                              if (res.success) { loadUsers(); } else alert(res.error || '삭제 실패');
                            }}>삭제</Button>
                          </>
                        ) : u.userIsActive === 0 ? (
                          <Button size="sm" variant="outline-danger" onClick={() => handleHardDelete(u)}>영구 삭제</Button>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={9 + (bankColsVisible ? 2 : 0) + (activeStatus === 'INACTIVE' ? 1 : 0) + (activeStatus !== 'ACTIVE' && activeStatus !== 'LEAVE' ? 1 : 0)} className="text-center py-5 text-muted">해당하는 직원이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AdminUsersTable;

