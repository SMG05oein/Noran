import React from 'react';
import RevisionHistory from './RevisionHistory';

const PrivacyPolicyContent = () => {
  return (
    <div className="privacy-body" style={{ fontSize: '0.86rem', lineHeight: '1.6' }}>
      <div className="text-muted small mb-5">
        <strong>'노란돼지'</strong>(이하 '회사')는 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다. 이에 「개인정보 보호법」 제30조에 따라 정보주체에게 개인정보 처리에 관한 절차 및 기준을 안내하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">1. 개인정보의 처리 목적, 수집 항목, 보유 및 이용기간</h5>
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
                <td><strong>회원 가입 및 관리</strong><br />(본인 식별, 권한 관리, 불량회원 부정이용 방지 등)</td>
                <td><strong>(필수)</strong> 아이디, 이름, 비밀번호, 생년월일, 휴대전화번호, 사용자 유형/권한, 소속 근무지<br /><strong>(선택)</strong> 이메일, 시급(관리자용)</td>
                <td className="text-center"><strong>회원 탈퇴 후 부정이용 방지 및 관계 법령에 따른 증빙 보존을 위해 5년간 보관 후 파기합니다.</strong></td>
                <td className="text-center">
                  정보주체의 동의 (개인정보보호법 제15조 제1항 제1호)<br /><br />
                  법령상 의무 준수 및 증빙 보관: <strong>5년</strong> (국세기본법 제85조의3, 근로기준법 제42조 등 관계 법령상 보존의무 중 가장 긴 기간 기준)
                </td>
              </tr>
              <tr>
                <td><strong>근태관리 및 근무 스케줄 배정</strong><br />(출퇴근 기록, 근무 신청 및 배정 관리)</td>
                <td><strong>(필수)</strong> 근무일, 출퇴근 시각, 휴게시간, 해당 근무지, 주간/일별 신청일<br /><strong>(선택)</strong> 근무 비고, 오픈조 지원 여부, 신청 비고</td>
                <td className="text-center"><strong>5년간 보관 후 파기</strong></td>
                <td className="text-center">
                  근로계약 이행 및 법령상 의무 준수: <strong>5년</strong> (국세기본법 제85조의3, 근로기준법 제42조 등 관계 법령상 보존의무 중 가장 긴 기간 기준)
                </td>
              </tr>
              <tr>
                <td><strong>급여 지급 및 정산</strong><br />(주간 스케줄 기반 급여 정산 및 이체)</td>
                <td><strong>(필수)</strong> 은행명, 예금주명, 계좌번호</td>
                <td className="text-center"><strong>5년간 보관 후 파기</strong></td>
                <td className="text-center">
                  법령상 의무 준수 및 증빙 보관: <strong>5년</strong> (국세기본법 제85조의3, 근로기준법 제42조 등 관계 법령상 보존의무 중 가장 긴 기간 기준)
                </td>
              </tr>
              <tr>
                <td><strong>서비스 이용 편의 및 맞춤 설정</strong><br />(로컬/세션 스토리지 활용)</td>
                <td><strong>(필수)</strong> 인증(로그인) 토큰 및 상태, API 응답 캐시 데이터<br /><strong>(선택)</strong> 자동 로그인 유지 설정, 팝업/공지사항 숨김 처리 내역</td>
                <td className="text-center"><strong>사용자 기기 내 보관<br />(로그아웃 또는 캐시 삭제 시 즉시 파기)</strong></td>
                <td className="text-center">정보주체의 동의 (개인정보보호법 제15조 제1항 제1호)</td>
              </tr>
              <tr>
                <td><strong>서비스 부정이용 방지 및 보안 관리</strong><br />(비정상 접근 차단 및 계정 보호)</td>
                <td><strong>(필수)</strong> 접속 IP 주소, 최근 로그인 일시</td>
                <td className="text-center"><strong>회원 탈퇴 후 5년간 보관 후 파기</strong></td>
                <td className="text-center">
                  「개인정보 보호법」 제29조(안전조치의무)에 따른 접속기록 보관 의무 준수<br />
                  <span className="small text-muted">(※ 법정 최소 보관기간 1년 이상 준수하며, 서비스 부정이용 방지 및 보안 분쟁 대비를 위해 5년간 보관)</span>
                </td>
              </tr>
              <tr>
                <td><strong>근무 관련 웹 푸시 알람</strong><br />(근무 기록 누락·배정 확정·신청 마감 안내)</td>
                <td><strong>(선택)</strong> 웹 푸시 구독 정보(endpoint, keys)</td>
                <td className="text-center"><strong>알람 해제 또는 퇴사·탈퇴 시 지체 없이 파기</strong></td>
                <td className="text-center">정보주체의 동의 (개인정보보호법 제15조 제1항 제1호)<br /><span className="small text-muted">미사용 시 서비스 이용에 불이익 없음</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-light p-3 rounded mt-3">
          <p className="small text-muted mb-0">
            * <strong>고유식별정보(주민등록번호 등) 처리 방침:</strong> 회사는 정보주체의 개인정보 보호 및 보안 리스크를 원천적으로 차단하기 위해, 본 근태관리 전산 시스템 내에서는 '주민등록번호' 및 '외국인등록번호' 등의 고유식별정보를 일절 수집하거나 저장하지 않습니다. 세무 신고 및 4대보험 처리 등에 필수적인 고유식별정보는 시스템 데이터베이스와 철저히 분리하여, 근로계약서 작성 시 서면 등 오프라인 채널을 통해서만 별도로 수집하고 관계 법령에 따라 안전하게 관리합니다.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">2. 개인정보의 제3자 제공</h5>
        <p className="small text-muted">
          회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.<br />
          * <strong>현재 회사는 정보주체의 개인정보를 제3자에게 제공하고 있지 않습니다.</strong>
        </p>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">3. 개인정보 처리업무의 위탁</h5>
        <p className="small text-muted mb-3">
          회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 외부에 위탁하고 있습니다. 위탁 계약 시 개인정보가 안전하게 관리될 수 있도록 필요한 사항을 규정하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독합니다.
        </p>
        <div className="table-responsive">
          <table className="table table-bordered align-middle text-sm" style={{ fontSize: '0.85rem' }}>
            <thead className="table-light text-center">
              <tr>
                <th style={{ width: '35%' }}>수탁자</th>
                <th style={{ width: '40%' }}>위탁 업무 내용</th>
                <th style={{ width: '25%' }}>개인정보 보유 및 이용기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Oracle Corporation</strong><br />
                  <span className="small text-muted">
                    (Oracle Cloud Infrastructure 제공)<br />
                    연락처: privacy_ww@oracle.com<br />
                    주소: 2300 Oracle Way, Austin, TX 78741, USA
                  </span>
                </td>
                <td>클라우드 서버 호스팅, 데이터 보관 및 서비스 운영 인프라 제공</td>
                <td className="text-center">회원 탈퇴 시 또는 위탁 계약 종료 시까지<br />(단, 관계 법령에 따른 보존기간이 있는 경우 해당 기간)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">4. 개인정보의 파기 절차 및 파기 방법</h5>
        <div className="small text-muted">
          <strong>① 파기 절차 및 파기 방법</strong><br />
          회사는 원칙적으로 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 <strong>지체 없이</strong> 해당 개인정보를 파기합니다.<br />
          - <strong>파기 절차:</strong> 파기 사유가 발생한 개인정보를 선정하고, 개인정보 보호책임자의 승인을 받아 파기합니다.<br />
          - <strong>파기 방법:</strong> 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 영구 삭제하며, 종이 문서에 기록된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.<br /><br />

          <strong>② 법령에 따른 보존 및 마스킹 처리</strong><br />
          정보주체의 퇴사 또는 회원 탈퇴 후 일정 기간이 경과하였으나, 근로기준법 및 국세기본법 등 관련 법령에 따라 근태 및 급여 기록 보존을 위해 개인정보를 계속 보존하여야 하는 경우, 회사는 접근 권한을 엄격히 통제한 상태로 원본 데이터베이스에 최대 5년간 보관합니다. 이때 개인정보 보호를 위해 <strong>퇴사 후 1년이 경과한 직원의 신상 정보는 내부 시스템 상에서 자동으로 마스킹 처리되며, 원본은 최고 관리자 및 권한이 있는 자만 제한적으로 조회</strong>할 수 있습니다. 보관 중인 개인정보는 법령 준수 및 부정이용 방지 외의 다른 용도로 이용되지 않습니다.<br /><br />

          <strong>③ 퇴사자 영구 삭제(Hard Delete) 및 자동 백업 정책</strong><br />
          - 회사는 원칙적으로 관계 법령에 따른 법정 보존기간(5년)이 경과한 후에 한하여 퇴사자의 개인정보 및 근태 기록을 영구 삭제합니다.<br />
          - 퇴사자의 개인정보 및 근태 기록을 영구 삭제할 경우, 관계 법령(근로기준법 및 국세기본법 등)에 따른 분쟁 대비 및 증빙 의무 준수를 위해 삭제 직전 <strong>해당 직원의 인적사항 및 전체 출퇴근 기록을 암호화된 백업 파일(.zip)로 생성하여 안전한 서버에 1년간 보관</strong>한 후 파기하며, 데이터베이스에서는 즉시 영구 파기합니다.
        </div>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">5. 개인정보의 국외 이전</h5>
        <p className="small text-muted mb-3">
          회사는 서비스 제공을 위한 클라우드 인프라 이용에 따라
          <strong> 「개인정보 보호법」 제28조의8 제1항 제3호 가목 및 제1호</strong>
          에 근거하여 정보주체의 동의를 받아 다음과 같이 개인정보를 국외로 이전합니다.
        </p>
        <div className="table-responsive mb-3">
          <table className="table table-bordered align-middle text-sm" style={{ fontSize: '0.85rem' }}>
            <thead className="table-light text-center">
              <tr>
                <th style={{ width: '22%' }}>이전 항목</th>
                <th style={{ width: '14%' }}>이전 국가</th>
                <th style={{ width: '22%' }}>이전 받는 자</th>
                <th style={{ width: '22%' }}>이전 목적·시기·방법</th>
                <th style={{ width: '20%' }}>보유·이용기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  제1조에 따라 수집·처리하는 개인정보 전부<br />
                  <span className="small text-muted">
                    (아이디, 이름, 비밀번호, 생년월일, 휴대전화번호, 소속 근무지, 근태·스케줄 정보, 계좌정보, 접속 IP 및 로그인 일시 등)
                  </span>
                </td>
                <td className="text-center">
                  <strong>일본</strong><br />
                  <span className="small text-muted">(오사카 리전)</span>
                </td>
                <td>
                  <strong>Oracle Corporation</strong><br />
                  <span className="small text-muted">
                    (Oracle Cloud Infrastructure)<br />
                    연락처: privacy_ww@oracle.com<br />
                    주소: 2300 Oracle Way, Austin, TX 78741, USA
                  </span>
                </td>
                <td>
                  <strong>목적:</strong> 클라우드 서버 호스팅·보관 및 서비스 제공<br />
                  <strong>시기:</strong> 최초 이전일 2026년 10월 22일, 이후 서비스 이용 시 수시 전송<br />
                  <strong>방법:</strong> HTTPS 등 암호화된 통신을 통한 전송·저장
                </td>
                <td className="text-center">
                  회원 탈퇴 및 관계 법령상 보존기간까지<br />
                  <span className="small text-muted">(제1조 보유기간과 동일)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="small text-muted">
          <strong>국외 이전 동의 거부 방법·절차 및 효과</strong><br />
          * <strong>거부 방법·절차:</strong> 정보주체는 개인정보 보호책임자(제10조)에게 전화 또는 서면·전자우편 등으로 국외 이전 동의를 거부할 수 있습니다. 회원가입 단계에서는 동의 화면에서 동의하지 않음으로써 거부할 수 있습니다.<br />
          * <strong>거부의 효과:</strong> 국외 이전 동의는 서비스 제공에 필수적이므로, 동의를 거부하는 경우 회원가입이 제한되거나 기존 회원의 경우 회원 탈퇴 및 개인정보 삭제 절차가 진행됩니다. (단, 관계 법령에 따른 보존 의무가 있는 정보는 해당 기간 동안 보관 후 파기합니다.)
        </div>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">6. 아동의 개인정보 보호</h5>
        <p className="small text-muted">
          회사는 만 15세 미만 아동의 회원가입을 제한하며, 만 15세 미만 아동의 개인정보를 수집하지 않습니다. (근로기준법 등 관련 법령에 따라 만 15세 미만 근로를 원칙적으로 제한하고 있습니다.)
        </p>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">7. 정보주체와 법정대리인의 권리·의무 및 행사 방법</h5>
        <p className="small text-muted">
          정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.<br />
          1. 개인정보 열람 요구<br />
          2. 오류 등이 있을 경우 정정 요구<br />
          3. 삭제 요구<br />
          4. 처리정지 요구<br /><br />
          * <strong>행사 방법:</strong> '내 정보' 메뉴를 통해 직접 열람, 정정, 탈퇴(삭제)가 가능하며, 서면, 전화, 전자우편(이메일) 등을 통해서도 권리 행사를 요청하실 수 있습니다.<br />
          * <strong>처리 기간 및 본인 확인:</strong> 회사는 정보주체의 권리 행사 요청을 받은 날로부터 10일 이내에 조치 결과를 통지합니다. 요청 시 주민등록증, 운전면허증 등의 신분증명서를 요구할 수 있으며 본인 여부를 확인한 후 조치합니다.
        </p>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">8. 개인정보의 안전성 확보 조치</h5>
        <p className="small text-muted">
          회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.<br /><br />
          * <strong>관리적 조치:</strong> 내부관리계획 수립·시행<br />
          * <strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리(역할 및 권한별 조회·다운로드 제한), 네트워크 전송구간 암호화(HTTPS/SSL 적용), 보안 프로그램 설치 및 주기적 점검, <strong>민감정보 등의 암호화</strong><br />
          &nbsp;&nbsp; - <strong>[암호화 저장 항목]</strong><br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; · <strong>비밀번호:</strong> 복호화가 불가능한 일방향 암호화(해시) 적용<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; · <strong>계좌번호:</strong> 안전한 암호화 알고리즘을 이용한 양방향 암호화 저장<br />
          * <strong>물리적·환경적 조치(클라우드):</strong> 클라우드 계정 및 접근키(API 키·SSH 키 등) 관리, 관리자 권한 최소화, 네트워크 접근 제한(방화벽·보안그룹 등), 클라우드 제공자의 데이터센터 물리적 보안 통제에 대한 계약상 보장 확인
        </p>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">9. 개인정보 자동 수집 장치의 설치·운영 및 그 거부에 관한 사항</h5>
        <p className="small text-muted">
          회사는 이용자에게 원활한 서비스(로그인 세션 유지, 팝업 안내 설정 등)를 제공하기 위해 이용자의 기기에 정보를 저장하고 수시로 불러오는 <strong>‘쿠키(cookie)’, ‘로컬스토리지’, ‘세션스토리지’</strong>를 사용합니다.<br /><br />
          * <strong>설치·운영 목적:</strong> 웹 브라우저와 서버 간의 통신을 위한 로그인 세션 유지, 보안 점검, 팝업 닫기 상태 유지 등 필수적인 서비스 운영 및 이용자 편의 제공<br />
          * <strong>거부 방법:</strong> 이용자는 웹 브라우저의 옵션 설정을 통해 쿠키 등의 저장을 거부할 수 있습니다. (단, 거부 시 로그인이 필요한 일부 서비스 이용에 어려움이 발생할 수 있습니다.)
        </p>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">10. 개인정보 보호책임자 및 담당 부서</h5>
        <div className="p-3 rounded-3 small text-muted" style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-border)' }}>
          <strong className="d-block mb-2 text-dark">개인정보 보호책임자</strong>
          <ul className="mb-0" style={{ listStyleType: 'none', paddingLeft: 0 }}>
            <li><strong>성명:</strong> 김민규</li>
            <li><strong>소속/직책:</strong> 약산돼지 / 점장</li>
            <li><strong>연락처:</strong> 010-8014-7013</li>
          </ul>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">11. 권익침해 구제방법</h5>
        <p className="small text-muted">
          정보주체는 개인정보침해로 인한 구제를 받기 위하여 아래의 기관에 분쟁해결이나 상담 등을 신청할 수 있습니다.<br /><br />
          * <strong>개인정보분쟁조정위원회:</strong> (국번없이) 1833-6972 (www.kopico.go.kr)<br />
          * <strong>개인정보침해신고센터:</strong> (국번없이) 118 (privacy.kisa.or.kr)<br />
          * <strong>대검찰청 사이버수사과:</strong> (국번없이) 1301 (www.spo.go.kr)<br />
          * <strong>경찰청 사이버수사국:</strong> (국번없이) 182 (ecrm.police.go.kr)
        </p>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">12. 개인정보 처리방침의 변경 및 고지</h5>
        <p className="small text-muted">
          이 개인정보 처리방침은 <strong>2026년 11월 01일</strong>부터 적용됩니다. 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시에는 변경되는 개인정보 처리방침을 시행하기 <strong>최소 7일 전 홈페이지 공지를 원칙으로 하되, 중대한 변경 시에는 30일전 공지하고 이메일 또는 카카오톡 등 개별 연락을 추가로 제공할 수 있습니다.</strong>
          <br />다만, 긴급한 서버 이전, 보안 사고 대응 등 불가피한 사유가 있는 경우에는 시행 후 지체 없이 공지할 수 있습니다.
          <br />또한 버전의 의미는 앞 자리는 핵심 내용의 변경 및 추가, 삭제가 있을 시며 뒷 자리는 경미한 내용 수정을 의미합니다.
        </p>
      </div>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-dark">13. 개정 이력</h5>
        <RevisionHistory
          histories={[
            {
              version: 'v2.1',
              date: '2026-10-25',
              content: (
                <ul className="mb-0 ps-3 mt-1">
                  <li>
                    <strong>개정 사유:</strong> 근무 관련 웹 푸시 알람 기능 도입에 따라, 선택 수집 항목으로 웹 푸시 구독 정보(endpoint, keys)를 추가하고 보유·파기 기준(알람 해제 또는 퇴사·탈퇴 시 지체 없이 파기)을 명시함
                  </li>
                </ul>
              )
            },
            {
              version: 'v2.0',
              date: '2026-10-22',
              content: (
                <ul className="mb-0 ps-3 mt-1">
                  <li>
                    <strong>개정 사유:</strong> 서비스 서버를 Oracle Cloud Infrastructure(일본 오사카 리전)로 이전함에 따라, 개인정보의 국외 보관·처리가 발생하여 관련 고지·동의가 필요해짐
                  </li>
                </ul>
              )
            },
            {
              version: 'v1.0',
              date: '2026-09-26',
              content: (
                <ul className="mb-0 ps-3 mt-1">
                  <li>개인정보 처리방침 제정 및 시행</li>
                </ul>
              )
            }
          ]}
        />
      </div>

      <div className="mt-5 pt-5">
        <p className="small text-muted mb-1">
          최초 시행일: 2026년 09월 26일
        </p>
        <p className="small text-muted mb-1">
          공고일: 2026년 10월 25일
        </p>
        <p className="small text-muted mb-1">
          시행일: 2026년 11월 01일
        </p>
        <p className="small text-muted mb-0">
          버전: v2.1
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicyContent;
