import { Modal, Button } from 'react-bootstrap';
import { RiCheckLine, RiCloseLine } from 'react-icons/ri';

const TermsModal = ({ show, onHide, type, onAgree, agreed = false }) => {
  // type: 'terms' | 'consent' | 'privacy'
  let title = '';
  let content = null;

  if (type === 'terms') {
    title = '근태관리시스템 이용규정';
    content = (
      <div className="terms-body" style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
        <p className="text-muted small mb-4">
          이 규정은 '노란돼지'(이하 '매장')가 소속 직원의 근무 신청, 근무 배정, 출퇴근 기록, 급여 정산의 기초 자료 마련을 위해 도입한 전자적 근태관리시스템(이하 '시스템')의 이용 방법과 직원의 준수사항을 안내하기 위해 마련되었습니다.
        </p>

        <h6 className="fw-bold text-dark mt-3 mb-2">1. 시스템 이용 대상</h6>
        <p className="text-muted small">
          이 시스템은 매장과 근로계약을 체결한 직원(이하 '직원') 및 근무 배정·근태 관리 업무를 담당하는 관리자가 이용합니다. 별도의 회원가입 승인 절차 없이 근로계약 체결과 동시에 회원가입 후 시스템을 이용합니다.
          <br /><span className="text-danger">* 시스템 이용 대상에 적용되지 않는 사람은 관리자가 별도의 통지 없이 이용 권한을 제한할 수 있습니다.</span>
        </p>

        <h6 className="fw-bold text-dark mt-3 mb-2">2. 계정 관리 및 자동 로그인</h6>
        <p className="text-muted small">
          ① 직원은 회원가입 시 실명(한글)으로 정보를 등록하여야 합니다.<br />
          ② 직원은 본인의 아이디와 비밀번호를 스스로 관리하여야 하며, 제3자에게 공유하거나 대리로 근태를 기록하게 해서는 안 됩니다.<br />
          ③ 계정 정보(연락처, 계좌번호 등)에 변경이 있는 경우 직원은 지체 없이 시스템에서 정보를 <strong>수정 또는 관리자에게 통보</strong>하여야 합니다.<br />
          ④ 시스템에서 아이디는 개인을 식별하는 유일한 식별자이며, 이로 인해 아이디는 변경이 불가능합니다.<br />
          ⑤ <strong>자동 로그인 안내:</strong> 이용 편의를 위해 인증 상태를 유지하는 '자동 로그인' 기능을 제공하며, 공용 기기 이용 시에는 자동 로그인을 해제하거나 이용 후 로그아웃하여야 합니다.
        </p>

        <h6 className="fw-bold text-dark mt-3 mb-2">3. 근무 신청 및 배정</h6>
        <p className="text-muted small">
          ① 직원은 매장이 정한 신청 기준(주 단위) 및 오픈 시간(평일 16시, 주말·공휴일 10시)과 원하는 날, 시간에 근무를 신청할 수 있습니다.<br />
          ② 근무 배정은 관리자의 승인을 통해 확정되며, 매장 사정에 따라 배정 내용이 협의 하에 변경될 수 있습니다.<br />
          ③ 근무 신청 마감은 일요일 23시 59분까지이나, 매장 상황에 따라 사전 고지된 시간으로 변경될 수 있습니다.
        </p>

        <h6 className="fw-bold text-dark mt-3 mb-2">4. 출퇴근 기록의 정확성</h6>
        <p className="text-muted small">
          ① 직원은 실제 근무한 시간과 일치하도록 출퇴근 및 휴게시간을 성실하게 기록하여야 합니다.<br />
          ② 고의로 허위 기록을 등록한 사실이 확인되는 경우 근로계약 및 관계 법령에 따른 조치의 대상이 될 수 있습니다.<br />
          ③ 등록된 근태 기록의 수정은 다음 월 1일 23:59까지만 가능합니다. 기한이 지난 건은 급여담당자에게 직접 연락하여야 합니다.
        </p>

        <h6 className="fw-bold text-dark mt-3 mb-2">5. 급여 정보의 성격</h6>
        <p className="text-muted small">
          ① 시스템에 표시되는 예상 급여는 참고 편의를 위한 계산 결과이며, 실제 지급 급여와 다를 수 있습니다.<br />
          ② 실제 급여는 근로계약 및 관계 법령에 따라 지급되며, 세부 사항은 급여담당자에게 문의하여야 합니다.
        </p>

        <h6 className="fw-bold text-dark mt-3 mb-2">6. 퇴사자 관리 및 영구 삭제 정책</h6>
        <p className="text-muted small">
          ① 직원이 퇴사하는 경우 시스템 접근 권한은 즉시 차단되며, 법정 의무 보존기간 동안 근태 및 급여 기록이 안전하게 분리 보관됩니다.<br />
          ② 퇴사자의 근태 기록 영구 삭제 시 관련 정보는 관계 법령에 따라 암호화된 압축 파일로 안전하게 백업되어 <strong>최대 5년간 보관</strong>된 후 파기되며, DB에서는 즉시 영구 파기됩니다.
        </p>
      </div>
    );
  } else if (type === 'consent') {
    title = '개인정보 수집 및 이용 동의';
    content = (
      <div className="consent-body" style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
        <p className="text-muted small mb-3">
          '노란돼지'는 원활한 서비스 제공을 위해 「개인정보 보호법」에 따라 아래와 같이 개인정보를 수집·이용하고자 합니다.
          <br /><strong className="text-danger">※ 본 서비스는 만 15세 이상을 대상으로 하며, 만 15세 미만 아동의 회원가입은 제한됩니다.</strong>
        </p>

        <div className="table-responsive my-3">
          <table className="table table-bordered align-middle" style={{ fontSize: '0.82rem' }}>
            <thead className="table-light text-center">
              <tr>
                <th style={{ width: '15%' }}>구분</th>
                <th style={{ width: '35%' }}>수집·이용 목적</th>
                <th style={{ width: '25%' }}>수집 항목</th>
                <th style={{ width: '25%' }}>보유 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center fw-bold text-danger">필수</td>
                <td>서비스 회원가입 및 관리, 본인 식별, 부정이용 방지</td>
                <td>이름, 아이디, 비밀번호, 생년월일, 연락처, 소속 지점</td>
                <td>탈퇴 후 최대 5년간 보관 후 파기</td>
              </tr>
              <tr>
                <td className="text-center fw-bold text-danger">필수</td>
                <td>근태관리 및 근무 스케줄 배정</td>
                <td>출퇴근 시간, 휴게시간, 근무지</td>
                <td>근로관계 종료 후 3년 (근로기준법)</td>
              </tr>
              <tr>
                <td className="text-center fw-bold text-danger">필수</td>
                <td>급여 정산 및 지급, 세무 신고</td>
                <td>은행명, 계좌번호, 예금주명</td>
                <td>퇴사 후 최대 3년 (세무 증빙 최대 5년)</td>
              </tr>
              <tr>
                <td className="text-center text-primary fw-bold">선택</td>
                <td>주요 공지사항 안내 및 원활한 의사소통</td>
                <td>이메일</td>
                <td>동의 철회 또는 회원 탈퇴 시 즉시 파기</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="small text-muted mb-0">
          귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있으나, 필수 항목 동의 거부 시 회원가입 및 서비스 이용이 제한됩니다.
        </p>
      </div>
    );
  } else if (type === 'privacy') {
    title = '개인정보처리방침 전문';
    content = (
      <div className="privacy-body" style={{ fontSize: '0.86rem', lineHeight: '1.6' }}>
        <div className="text-muted small mb-4">
          <strong>'노란돼지'</strong>는 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하며, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다.
        </div>

        <h6 className="fw-bold text-dark mt-3 mb-2">1. 개인정보의 처리 목적, 수집 항목, 보유 및 이용기간</h6>
        <div className="table-responsive mb-3">
          <table className="table table-bordered align-middle text-sm" style={{ fontSize: '0.8rem' }}>
            <thead className="table-light text-center">
              <tr>
                <th style={{ width: '25%' }}>처리 목적</th>
                <th style={{ width: '35%' }}>수집 항목</th>
                <th style={{ width: '20%' }}>보유 기간</th>
                <th style={{ width: '20%' }}>법적 근거</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>회원 가입 및 관리</strong></td>
                <td>(필수) 이름, 아이디, 비밀번호, 생년월일, 연락처, 지점<br />(선택) 이메일</td>
                <td className="text-center">탈퇴 후 최대 5년 보관 후 파기</td>
                <td className="text-center">정보주체 동의, 국세기본법·근로기준법</td>
              </tr>
              <tr>
                <td><strong>근태관리 및 근무 배정</strong></td>
                <td>(필수) 출퇴근 시간, 휴게시간, 근무지</td>
                <td className="text-center">근로관계 종료 후 3년</td>
                <td className="text-center">근로계약 이행</td>
              </tr>
              <tr>
                <td><strong>급여 정산 및 지급</strong></td>
                <td>(필수) 은행명, 예금주명, 계좌번호</td>
                <td className="text-center">관계 법령에 따라 3년~5년 보존 후 파기</td>
                <td className="text-center">근로기준법, 소득세법</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h6 className="fw-bold text-dark mt-3 mb-2">2. 개인정보의 제3자 제공 및 위탁</h6>
        <p className="text-muted small">
          • 제3자 제공: 회사는 정보주체의 동의 없이 외부에 개인정보를 제공하지 않습니다.<br />
          • 위탁 업무: 급여 정산 및 원천세 신고 대행을 위해 세무대리인에게 법령에 규정된 최소한의 정보를 위탁합니다.
        </p>

        <h6 className="fw-bold text-dark mt-3 mb-2">3. 퇴사자 관리 및 파기/백업 정책</h6>
        <p className="text-muted small">
          퇴사자의 근태 기록 영구 삭제 시 관계 법령(근로기준법 및 소득세법 등)에 따른 분쟁 대비를 위해 <strong>해당 직원의 인적사항 및 전체 출퇴근 기록을 암호화된 백업 파일(.zip)로 서버에 5년간 안전하게 보관</strong>한 후 파기하며, 데이터베이스에서는 즉시 영구 파기합니다.
        </p>

        <h6 className="fw-bold text-dark mt-3 mb-2">4. 개인정보의 안전성 확보 조치</h6>
        <p className="text-muted small">
          비밀번호 일방향 암호화(BCrypt), 계좌번호 양방향 암호화 보관, 전담 직원 외 접근 제한 등 안전성 확보 조치를 성실히 이행합니다.
        </p>

        <h6 className="fw-bold text-dark mt-3 mb-2">5. 개인정보 보호책임자</h6>
        <p className="text-muted small mb-0">
          • 성명: 김민규 (점장)<br />
          • 연락처: 010-8014-7013
        </p>
      </div>
    );
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {content}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="secondary" onClick={onHide} className="rounded-3 px-3">
          <RiCloseLine size={16} /> 닫기
        </Button>
        {onAgree && type !== 'privacy' && (
          <Button
            variant={agreed ? "success" : "primary"}
            onClick={() => {
              onAgree();
              onHide();
            }}
            className="fw-bold rounded-3 px-4 d-flex align-items-center gap-1"
          >
            <RiCheckLine size={18} />
            {agreed ? '이미 동의함 (확인)' : '확인 및 동의'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default TermsModal;
