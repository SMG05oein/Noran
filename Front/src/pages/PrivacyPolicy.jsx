import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  return (
    <Container className="py-5" style={{ maxWidth: '800px' }}>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4 p-md-5">
          <h2 className="fw-bold mb-4 text-center">개인정보처리방침</h2>
          <div className="text-muted small mb-5">
            <strong>'노란돼지'</strong>(이하 '회사')는 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다. 이에 「개인정보 보호법」 제30조에 따라 정보주체에게 개인정보 처리에 관한 절차 및 기준을 안내하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">1. 개인정보의 처리 목적, 수집 항목, 보유 및 이용기간</h5>
            <p className="small text-muted mb-3">
              회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 법령에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <div className="table-responsive">
              <table className="table table-bordered align-middle text-sm" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light text-center">
                  <tr>
                    <th style={{ width: '25%' }}>처리 목적</th>
                    <th style={{ width: '35%' }}>수집 항목</th>
                    <th style={{ width: '20%' }}>보유 및 이용기간</th>
                    <th style={{ width: '20%' }}>법적 근거</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>회원 가입 및 관리</strong><br />(본인 식별, 불량회원 부정이용 방지 등)</td>
                    <td><strong>(필수)</strong> 이름, 아이디, 비밀번호, 생년월일, 휴대전화번호, 소속 지점<br /><strong>(선택)</strong> 이메일</td>
                    <td className="text-center"><strong>회원 탈퇴 후 부정이용 방지 및 관계 법령에 따른 증빙 보존을 위해 최대 5년간 필요한 부분을 마스킹한 후 분리 보관 후 파기합니다.</strong></td>
                    <td className="text-center">
                      정보주체의 동의 (개인정보보호법 제15조 제1항 제1호)<br /><br />
                      법령상 의무 준수 및 증빙 보관: <strong>최대 5년</strong> (국세기본법 제85조의3, 근로기준법 제42조)
                    </td>
                  </tr>
                  <tr>
                    <td><strong>근태관리 및 근무 스케줄 배정</strong><br />(출퇴근 기록, 근무지별 배정 관리)</td>
                    <td><strong>(필수)</strong> 출퇴근 시간, 휴게시간, 근무지, 배정 시간</td>
                    <td className="text-center"><strong>근로관계 종료 후 3년</strong></td>
                    <td className="text-center">근로계약 이행 (개인정보보호법 제15조 제1항 제4호)</td>
                  </tr>
                  <tr>
                    <td><strong>급여 지급 및 정산</strong><br />(주간 스케줄 기반 급여 정산 및 이체)</td>
                    <td><strong>(필수)</strong> 은행명, 예금주명, 계좌번호</td>
                    <td className="text-center"><strong>근로관계 종료 후 관계 법령에 따라 보존 후 파기</strong></td>
                    <td className="text-center">근로계약, 임금대장 등: <strong>3년</strong> (근로기준법)<br /><br />세무 관련 증빙서류: <strong>5년</strong> (소득세법, 법인세법)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">2. 개인정보의 제3자 제공</h5>
            <p className="small text-muted">
              회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.<br />
              * <strong>현재 회사는 정보주체의 개인정보를 제3자에게 제공하고 있지 않습니다.</strong>
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">3. 개인정보 처리업무의 위탁</h5>
            <p className="small text-muted mb-3">
              회사는 원활한 서비스 제공 및 급여 정산(세무 신고)을 위해 아래와 같이 개인정보 처리업무를 위탁하고 있습니다.
            </p>
            <div className="table-responsive">
              <table className="table table-bordered align-middle text-sm" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light text-center">
                  <tr>
                    <th style={{ width: '25%' }}>수탁자(위탁받는 자)</th>
                    <th style={{ width: '30%' }}>위탁하는 업무의 내용(목적)</th>
                    <th style={{ width: '25%' }}>제공 항목</th>
                    <th style={{ width: '20%' }}>보유 및 이용기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-center text-primary fw-bold">[세무대리인 업체명 기재 요망]</td>
                    <td className="text-center"><strong>급여 정산 및 세무/원천세 신고 대행</strong></td>
                    <td className="text-center">이름, 은행명, 예금주명, 계좌번호, 출퇴근 날짜와 시간, 총 근로 시간</td>
                    <td className="text-center"><strong>위탁계약 종료 시 또는 관련 세법상 의무 보존기간까지</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">4. 개인정보의 파기 절차 및 파기 방법</h5>
            <div className="small text-muted">
              <strong>① 파기 절차 및 파기 방법</strong><br />
              회사는 원칙적으로 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 <strong>지체 없이</strong> 해당 개인정보를 파기합니다.<br />
              - <strong>파기 절차:</strong> 파기 사유가 발생한 개인정보를 선정하고, 개인정보 보호책임자의 승인을 받아 파기합니다.<br />
              - <strong>파기 방법:</strong> 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 영구 삭제하며, 종이 문서에 기록된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.<br /><br />

              <strong>② 분리 보관 (아카이빙)</strong><br />
              정보주체의 퇴사 또는 회원 탈퇴 후 일정 기간이 경과하였으나, 근로기준법 및 국세기본법 등 관련 법령에 따라 근태 및 급여 기록 보존을 위해 개인정보를 계속 보존하여야 하는 경우, 회사는 해당 개인정보를 원본 데이터베이스에서 논리적·물리적으로 분리된 별도의 아카이빙(Archiving) 데이터베이스로 이동하여 <strong>최대 5년간 분리 보관</strong>합니다. 분리 보관된 개인정보는 법령 준수 및 부정이용 방지 외의 다른 용도로 이용되지 않습니다.<br /><br />

              <strong>③ 퇴사자 영구 삭제(Hard Delete) 및 자동 백업 정책</strong><br />
              - 퇴사자의 개인정보 및 근태 기록을 영구 삭제할 경우, 관계 법령(근로기준법 및 국세기본법 등)에 따른 분쟁 대비 및 증빙 의무 준수를 위해 삭제 직전 <strong>해당 직원의 인적사항 및 전체 출퇴근 기록을 암호화된 백업 파일(.zip)로 생성하여 안전한 서버에 5년간 보관</strong>한 후 파기하며, 데이터베이스에서는 즉시 영구 파기합니다.
            </div>
          </div>


          <div className="mb-4">
            <h5 className="fw-bold mb-3">5. 개인정보의 국외 이전</h5>
            <p className="small text-muted">
              회사는 정보주체의 개인정보를 국외로 이전(제공, 위탁, 보관)하지 않습니다.
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">6. 아동의 개인정보 보호</h5>
            <p className="small text-muted">
              회사는 만 15세 미만 아동의 회원가입을 제한하며, 만 15세 미만 아동의 개인정보를 수집하지 않습니다. (근로기준법 등 관련 법령에 따라 만 15세 미만 근로를 원칙적으로 제한하고 있습니다.)
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">7. 정보주체와 법정대리인의 권리·의무 및 행사 방법</h5>
            <p className="small text-muted">
              정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.<br />
              1. 개인정보 열람 요구<br />
              2. 오류 등이 있을 경우 정정 요구<br />
              3. 삭제 요구<br />
              4. 처리정지 요구<br /><br />
              * <strong>행사 방법:</strong> '내 정보' 메뉴를 통해 직접 열람, 정정, 탈퇴(삭제)가 가능하며, 서면, 전화, 전자우편(이메일) 등을 통해서도 권리 행사를 요청하실 수 있습니다.<br />
              * <strong>처리 기간 및 본인 확인:</strong> 회사는 정보주체의 권리 행사 요청을 받은 날로부터 10일 이내에 조치 결과를 통지합니다. 요청 시 주민등록증, 운전면허증 등의 신분증명서를 통해 본인 여부를 확인한 후 조치합니다.
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">8. 개인정보의 안전성 확보 조치</h5>
            <p className="small text-muted">
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.<br /><br />
              * <strong>관리적 조치:</strong> 내부관리계획 수립·시행, 전담 직원 배정 및 정기적 개인정보 보호 교육<br />
              * <strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리, 보안 프로그램 설치 및 주기적 점검, <strong>민감정보 등의 암호화</strong><br />
              &nbsp;&nbsp; - <strong>[암호화 저장 항목]</strong><br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; · <strong>비밀번호:</strong> 복호화가 불가능한 일방향 암호화(해시) 적용<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; · <strong>계좌번호:</strong> 안전한 암호화 알고리즘을 이용한 양방향 암호화 저장<br />
              * <strong>물리적 조치:</strong> 데이터 보관 서버에 대한 접근 통제
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">9. 개인정보 자동 수집 장치의 설치·운영 및 그 거부에 관한 사항</h5>
            <p className="small text-muted">
              회사는 이용자에게 원활한 서비스(로그인 세션 유지, 팝업 안내 설정 등)를 제공하기 위해 이용자의 기기에 정보를 저장하고 수시로 불러오는 <strong>‘쿠키(cookie)’, ‘로컬스토리지’, ‘세션스토리지’</strong>를 사용합니다.<br /><br />
              * <strong>설치·운영 목적:</strong> 웹 브라우저와 서버 간의 통신을 위한 로그인 세션 유지, 보안 점검, 팝업 닫기 상태 유지 등 필수적인 서비스 운영 및 이용자 편의 제공<br />
              * <strong>거부 방법:</strong> 이용자는 웹 브라우저의 옵션 설정을 통해 쿠키 등의 저장을 거부할 수 있습니다. (단, 거부 시 로그인이 필요한 일부 서비스 이용에 어려움이 발생할 수 있습니다.)
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">10. 개인정보 보호책임자 및 담당 부서</h5>
            <div className="p-3 rounded-3 small text-muted" style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-border)' }}>
              <strong className="d-block mb-2">개인정보 보호책임자 (개인정보처리자 겸임)</strong>
              <ul className="mb-0" style={{ listStyleType: 'none', paddingLeft: 0 }}>
                <li><strong>성명:</strong> 김민규</li>
                <li><strong>소속/직책:</strong> 약산돼지 / 점장</li>
                <li><strong>연락처:</strong> 010-8014-7013</li>
              </ul>
            </div>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">11. 권익침해 구제방법</h5>
            <p className="small text-muted">
              정보주체는 개인정보침해로 인한 구제를 받기 위하여 아래의 기관에 분쟁해결이나 상담 등을 신청할 수 있습니다.<br /><br />
              * <strong>개인정보분쟁조정위원회:</strong> (국번없이) 1833-6972 (www.kopico.go.kr)<br />
              * <strong>개인정보침해신고센터:</strong> (국번없이) 118 (privacy.kisa.or.kr)<br />
              * <strong>대검찰청 사이버수사과:</strong> (국번없이) 1301 (www.spo.go.kr)<br />
              * <strong>경찰청 사이버수사국:</strong> (국번없이) 182 (ecrm.police.go.kr)
            </p>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold mb-3">12. 개인정보 처리방침의 변경 및 고지</h5>
            <p className="small text-muted">
              이 개인정보 처리방침은 <strong>2026년 09월 17일</strong>부터 적용됩니다. 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시에는 변경되는 개인정보 처리방침을 시행하기 <strong>최소 7일 전 홈페이지 공지를 원칙으로 하되, 중대한 변경 시에는 30일전 공지하고 이메일 또는 카카오톡 등 개별 연락을 추가로 제공할 수 있습니다.</strong>
              <br />또한 버전의 의미는 앞 자리는 핵심 내용의 변경 및 추가, 삭제가 있을 시며 뒷 자리는 경미한 내용 수정을 의미합니다.
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

export default PrivacyPolicy;
