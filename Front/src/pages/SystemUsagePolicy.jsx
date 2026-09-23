import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const SystemUsagePolicy = () => {
  const navigate = useNavigate();
  return (
    <Container className="py-5" style={{ maxWidth: '800px' }}>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4 p-md-5">
          <h2 className="fw-bold mb-4 text-center">근태관리시스템 이용규정</h2>
          <div className="text-muted small mb-5">
            이 규정은 '노란돼지'(이하 '매장')가 소속 직원의 근무 신청, 근무 배정, 출퇴근 기록, 급여 정산의 기초 자료 마련을 위해 도입한 전자적 근태관리시스템(이하 '시스템')의 이용 방법과 직원의 준수사항을 안내하기 위해 마련되었습니다. 이 시스템은 매장이 외부에 제공하는 서비스가 아니라, 근로계약에 따른 근태관리 업무 처리를 위해 매장이 도입한 내부 업무도구입니다.
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">1. 시스템 이용 대상</h5>
            <p className="small text-muted">
              이 시스템은 매장과 근로계약을 체결한 직원(이하 '직원') 및 근무 배정·근태 관리 업무를 담당하는 관리자가 이용합니다. 별도의 회원가입 승인 절차 없이 근로계약 체결과 동시에 회원가입 후 시스템을 이용합니다.
            </p>
            <div className="small text-muted"> * 시스템 이용 대상에 적용되지 않는 사람은 관리자가 별도의 통지 없이 이용 권한을 제한할 수 있습니다</div>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">2. 계정 관리</h5>
            <p className="small text-muted">
              ① 직원은 회원가입 시 실명(한글)으로 정보를 등록하여야 합니다.<br />
              ② 직원은 본인의 아이디와 비밀번호를 스스로 관리하여야 하며, 제3자에게 공유하거나 대리로 근태를 기록하게 해서는 안 됩니다.<br />
              ③ 계정 정보(연락처, 계좌번호 등)에 변경이 있는 경우 직원은 지체 없이 시스템에서 정보를 <strong> 수정 또는 관리자에게 통보</strong>하여야 합니다.<br/>
              ④ 시스템에서 아이디는 개인을 식별하는 유일한 식별자이며, 이로 인해 아이디는 변경이 불가능합니다. 만일 불가피하게 아이디 변경이 필요할 경우 관리자에게 문의하여야 합니다.
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">3. 근무 신청 및 배정</h5>
            <p className="small text-muted">
              ① 직원은 매장이 정한 신청 기준(주 단위) 및 오픈 시간(평일 16시, 주말·공휴일 10시)과 원하는 날, 시간에 근무를 신청할 수 있습니다.<br />
              ② 근무 배정은 관리자의 승인을 통해 확정되며, 매장 사정에 따라 배정 내용이 변경될 수 있습니다. 이는 직원과 협의 하에 이뤄집니다.<br />
              ③ 동일한 날짜에 서로 다른 근무지에서 근무하는 경우, 근무지별로 신청 및 기록을 구분하여 등록하여야 합니다.<br />
              ④ 근무 신청 마감은 일요일 23시59분까지이나, 상황에 따라 관리자가 별도로 고지한 시간으로 변경될 수 있습니다. <br/>
              ⑤ 신청 기간 이외에 신청이 가능하긴 하나 관리자의 판단에 따라 변경될 수 있습니다.
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">4. 출퇴근 기록의 정확성</h5>
            <p className="small text-muted">
              ① 직원은 실제 근무한 시간과 일치하도록 출퇴근 및 휴게시간을 성실하게 기록하여야 합니다.<br />
              ② 사실과 다른 근태 기록을 등록하여 급여 등 부당한 이익을 취해서는 안 되며, 고의로 허위 기록을 등록한 사실이 확인되는 경우 근로계약 및 관계 법령에 따른 조치의 대상이 될 수 있습니다.<br />
              ③ 등록된 근태 기록의 수정은 다음 월 1일 23:59까지만 가능합니다. 수정 버튼을 누르면 수정 가능 기한이 표시되며, 기한이 지난 건에 대한 정정이 필요한 경우 급여담당자에게 직접 연락하여야 합니다.
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">5. 급여 정보의 성격</h5>
            <p className="small text-muted">
              ① 시스템에 표시되는 예상 급여(시급 × 근무시간 기준, 3.3% 공제 반영)는 직원의 참고 편의를 위해 제공되는 계산 결과이며, 실제 지급되는 급여와 다를 수 있습니다.<br />
              ② 실제 급여는 근로계약 및 관계 법령(근로기준법, 소득세법 등)에 따라 지급되며, 화면상 예상 금액과 실제 지급액에 차이가 있으며 급여에 대한 문의는 급여담당자에게 문의하여야 합니다.
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">6. 개인정보의 처리</h5>
            <p className="small text-muted">
              시스템을 통해 수집·처리되는 개인정보의 항목, 목적, 보유기간 등은 매장의 개인정보처리방침 및 개인정보 수집·이용 동의서에 따릅니다. 직원은 근로계약 체결 시와 회원가입에서의 동의로서 해당 내용을 동의합니다.
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">7. 금지행위</h5>
            <p className="small text-muted">
              직원은 시스템 이용과 관련하여 다음 행위를 하여서는 안 됩니다.<br />
              ① 타인의 계정으로 로그인하거나 타인의 근태를 대리로 기록하는 행위<br />
              ② 허위의 근태 기록 또는 개인정보를 등록하는 행위<br />
              ③ 시스템의 정상적인 운영을 방해하거나 취약점을 이용하는 행위<br />
              ④ 시스템을 통해 열람한 다른 직원의 정보(근태, 급여, 연락처 등)를 본래 목적 외로 이용하거나 제3자에게 알리는 행위
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">8. 급여 처리의 주체 및 시스템 오류 처리와 신고의 권한</h5>
            <p className="small text-muted">
              ① 이 시스템은 직원의 근태 기록 관리 및 예상 급여를 표시하는 도구일 뿐이며, 실제 급여의 계산 및 지급 업무는 수행하지 않습니다. 실제 급여의 계산 및 지급은 매장이 위탁한 세무대리인이 근태 기록을 기초로 별도로 처리합니다.<br />
              ② 시스템 화면상의 오류(근태 기록 표시 오류, 예상 급여 계산 오류 등)를 발견한 경우, 직원은 매장(급여담당자) 또는 시스템 담당자 신고하여야 하며, 확인된 시스템 오류는 지체 없이(5일 이내) 수정됩니다. 단, 시스템에에 지대한 영향을 미치는 오류일 경우 시스템 담장자는 별도의 비상 조치를 취할 수 있습니다.<br />
              ③ 실제 지급되는 급여에 오류나 이견이 있는 경우, 이는 시스템 문제가 아닌 별도의 급여 지급 절차에 관한 사항이므로 매장(급여담당자)에게 직접 문의하여야 합니다. 다만 매장은 어떠한 경우에도 근로기준법에 따른 임금 전액 지급 의무를 부담합니다.
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">9. 문의 및 이의제기</h5>
            <p className="small text-muted">
              시스템 이용 중 발생하는 문의, 오류 신고, 근태·급여 관련 이의제기는 시스템 담당자(근태·급여 제외) 또는 관리자에게 직접 연락하여 처리합니다.
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">10. 이용규정 변경 및 버전 정보</h5>
            <p className="small text-muted">
              ① 매장은 규정 내용을 변경하는 경우 시행 전에 직원에게 안내합니다.<br />
              ② 변경 전 최소 3일 전에 고지합니다. 다만 근태 기록 수정기한 등 이미 진행 중인 절차에 영향을 미치는 변경은 해당 주기(주)가 끝난 이후부터 적용합니다.<br />
              ③ 버전의 의미는 앞 자리는 핵심 내용의 변경 및 추가, 삭제가 있을 시며 뒷 자리는 경미한 내용 수정을 의미합니다.


            </p>
          </div>
          <div className="mt-5 pt-5">
            <p className="small text-muted">
              최초 시행일: -
            </p>
            <p className="small text-muted">
              공고일: -
            </p>
            <p className="small text-muted">
              시행일: -
            </p>
            <p className="small text-muted">
              버전: v1.0
            </p>
          </div>

          <div className="text-center mt-5">
            <Button variant="secondary" onClick={() => navigate(-1)} className="px-4 fw-bold">
              이전
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SystemUsagePolicy;
