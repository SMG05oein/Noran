import React from 'react';
import RevisionHistory from './RevisionHistory';

const ConsentPolicyContent = () => {
  return (
    <div className="consent-body" style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
      <div className="text-muted small mb-4">
        '노란돼지'(이하 '회사')는 원활한 서비스 제공을 위해 「개인정보 보호법」 및 관계 법령에 따라 아래와 같이 귀하의 개인정보를 수집·이용하고자 합니다. 내용을 자세히 읽으신 후 동의 여부를 결정해 주시기 바랍니다.
        <br /><br />
        <strong className="text-danger">※ 본 서비스는 만 15세 이상을 대상으로 하며, 만 15세 미만 아동의 회원가입은 제한됩니다.</strong>
      </div>

      <h5 className="fw-bold mt-5 mb-3 text-dark">1. 개인정보 수집 및 이용 내역 (필수/선택)</h5>
      <div className="table-responsive mb-4">
        <table className="table table-bordered align-middle text-sm" style={{ fontSize: '0.9rem' }}>
          <thead className="table-light text-center">
            <tr>
              <th style={{ width: '10%' }}>구분</th>
              <th style={{ width: '35%' }}>수집·이용 목적</th>
              <th style={{ width: '25%' }}>수집 항목</th>
              <th style={{ width: '30%' }}>보유 및 이용 기간</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center fw-bold text-danger">필수</td>
              <td><strong>서비스 회원가입 및 관리, 본인 식별, 불량회원 부정이용 방지</strong></td>
              <td>아이디, 이름, 비밀번호, 생년월일, 휴대전화번호, 사용자 유형/권한, 소속 근무지</td>
              <td><strong>회원 탈퇴 후 부정이용 방지 및 관계 법령에 따른 보존 목적을 위해 최대 5년간 보관한 후 파기합니다.</strong></td>
            </tr>
            <tr>
              <td className="text-center fw-bold text-danger">필수</td>
              <td><strong>근태관리 및 근무 스케줄 배정</strong></td>
              <td>근무일, 출퇴근 시각, 휴게시간, 해당 근무지, 주간/일별 신청일</td>
              <td><strong>관계 법령(국세기본법 등)에 따라 최대 5년간 보관한 후 파기합니다.</strong></td>
            </tr>
            <tr>
              <td className="text-center fw-bold text-danger">필수</td>
              <td><strong>급여 정산 및 지급, 세무 신고</strong></td>
              <td>은행명, 예금주명, 계좌번호</td>
              <td><strong>관계 법령(국세기본법 등)에 따라 최대 5년간 보관한 후 파기합니다.</strong></td>
            </tr>
            <tr>
              <td className="text-center text-primary fw-bold">선택</td>
              <td><strong>주요 공지사항 안내 및 원활한 의사소통 경로 확보</strong></td>
              <td>이메일</td>
              <td>선택 항목 동의 철회 또는 회원 탈퇴 시 지체 없이 파기합니다.</td>
            </tr>
            <tr>
              <td className="text-center fw-bold text-danger">필수</td>
              <td><strong>서비스 부정이용 방지 및 보안 관리</strong></td>
              <td>접속 IP 주소, 최근 로그인 일시</td>
              <td><strong>회원 탈퇴 후 최대 5년간 보관한 후 파기합니다.</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="bg-light p-3 rounded mb-4">
        <p className="small text-muted mb-2">
          * <strong>파기 원칙:</strong> 원칙적으로 개인정보의 수집 및 이용 목적이 달성된 후(또는 명시된 보유기간 경과 후)에는 해당 정보를 지체 없이(5일 이내) 파기합니다.
        </p>
        <p className="small text-muted mb-0">
          * <strong>고유식별정보(주민등록번호 등) 처리 안내:</strong> 회사는 정보주체의 소중한 개인정보 보호 및 보안 리스크 최소화를 위하여 본 전자 시스템을 통한 고유식별정보(주민등록번호, 외국인등록번호 등)의 수집을 원천적으로 배제하고 있습니다. 원천세 신고 등 관련 법령에 따라 필수적으로 요구되는 고유식별정보는 본 전산 시스템을 거치지 않고, 근로계약 체결 시 서면(종이 문서) 등 물리적 채널을 통해 별도로 분리하여 안전하게 수집 및 엄격히 관리됩니다.
        </p>
      </div>

      <h5 className="fw-bold mt-4 mb-3 text-dark">2. 동의를 거부할 권리 및 불이익</h5>
      <p className="small text-muted mb-4">
        귀하는 위 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.<br />
        * <strong>필수 항목 동의 거부 시:</strong> 서비스의 본질적인 기능(회원가입, 스케줄 관리, 급여 정산 등) 제공이 불가능하므로 <strong>회원가입 및 서비스 이용이 제한</strong>됩니다.<br />
        * <strong>선택 항목 동의 거부 시:</strong> 동의하지 않으셔도 기본적인 서비스 이용에는 불이익이 없으나, 이메일 공지 등의 <strong>일부 부가 기능 이용이 제한</strong>될 수 있습니다.
      </p>

      <h5 className="fw-bold mt-4 mb-3 text-dark">3. 개정 이력</h5>
      <div className="mb-4">
        <RevisionHistory 
          histories={[
            {
              version: 'v1.2',
              date: '2026-10-17',
              content: (
                <ul className="mb-0 ps-3 mt-1">
                  <li>보안 강화 및 부정이용 방지를 위한 수집 항목(IP 주소, 로그인 일시) 추가</li>
                </ul>
              )
            },
            {
              version: 'v1.1',
              date: '2026-10-03',
              content: (
                <>
                  <ul className="mb-2 ps-3 mt-1">
                    <li>약관 시스템 공통화 및 전문 노출 방식 개선 반영</li>
                    <li>문서 하단 개정 이력 항목 신설</li>
                  </ul>
                  <p className="mb-0" style={{ color: '#d97706' }}>
                    ※ (알파 테스트 기간 운영 안내) 본 개정은 현재 시스템이 알파 테스트 기간임에 따라, 원활한 테스트 진행 및 즉각적인 피드백 반영을 위해 사전 공지 기간 예외를 적용하여 즉시 시행되었습니다.
                  </p>
                </>
              )
            },
            {
              version: 'v1.0',
              date: '2026-09-26',
              content: (
                <ul className="mb-0 ps-3 mt-1">
                  <li>개인정보 수집 및 이용 동의서 최초 제정</li>
                </ul>
              )
            }
          ]}
        />
      </div>

      <div className="mt-5 pt-4 border-top">
        <p className="small text-muted mb-1">
          <strong>최초 시행일:</strong> 2026년 09월 26일
        </p>
        <p className="small text-muted mb-1">
          <strong>공고일:</strong> 2026년 10월 10일
        </p>
        <p className="small text-muted mb-1">
          <strong>시행일:</strong> 2026년 10월 17일
        </p>
        <p className="small text-muted mb-0">
          <strong>버전:</strong> v1.2
        </p>
      </div>
    </div>
  );
};

export default ConsentPolicyContent;
