import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const ConsentPolicy = () => {
  const navigate = useNavigate();
  return (
    <Container className="py-5" style={{ maxWidth: '800px' }}>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4 p-md-5">
          <h2 className="fw-bold mb-4 text-center">개인정보 수집 및 이용 동의서</h2>
          <div className="text-muted small mb-4">
            '노란돼지'(이하 '회사')는 원활한 서비스 제공을 위해 「개인정보 보호법」 및 관계 법령에 따라 아래와 같이 귀하의 개인정보를 수집·이용하고자 합니다. 내용을 자세히 읽으신 후 동의 여부를 결정해 주시기 바랍니다.
            <br /><br />
            <strong className="text-danger">※ 본 서비스는 만 15세 이상을 대상으로 하며, 만 15세 미만 아동의 회원가입은 제한됩니다.</strong>
          </div>

          <h5 className="fw-bold mt-5 mb-3">1. 개인정보 수집 및 이용 내역 (필수/선택)</h5>
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
                  <td><strong>근로관계 종료 후 3년 (근로기준법)</strong></td>
                </tr>
                <tr>
                  <td className="text-center fw-bold text-danger">필수</td>
                  <td><strong>급여 정산 및 지급, 세무 신고</strong></td>
                  <td>은행명, 예금주명, 계좌번호</td>
                  <td>
                    <strong>근로계약 종료 후 근로기준법 등 관계 법령이 정하는 보존기간(최대 3년) 동안 보관한 후 파기합니다.</strong>
                    <br /><span className="text-muted" style={{fontSize: '0.8rem'}}>(※ 단, 필요한 경우 세무 관련 증빙자료는 소득세법 등에 따라 최대 5년 보존)</span>
                  </td>
                </tr>
                <tr>
                  <td className="text-center fw-bold text-danger">필수</td>
                  <td><strong>서비스 환경 최적화 및 시스템 보안 (자동 수집)</strong></td>
                  <td>접속 기기 정보(OS), 브라우저 정보(User Agent), 접속 IP 주소, 서비스 이용 기록</td>
                  <td><strong>관계 법령(통신비밀보호법 등)에 따라 최대 1년간 보관 후 파기</strong></td>
                </tr>
                <tr>
                  <td className="text-center text-primary fw-bold">선택</td>
                  <td><strong>주요 공지사항 안내 및 원활한 의사소통 경로 확보</strong></td>
                  <td>이메일</td>
                  <td>선택 항목 동의 철회 또는 회원 탈퇴 시 지체 없이 파기합니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small text-muted mb-4">
            * <strong>파기 원칙:</strong> 원칙적으로 개인정보의 수집 및 이용 목적이 달성된 후(또는 명시된 보유기간 경과 후)에는 해당 정보를 지체 없이(5일 이내) 파기합니다.
          </p>

          <h5 className="fw-bold mt-4 mb-3">2. 동의를 거부할 권리 및 불이익</h5>
          <p className="small text-muted mb-4">
            귀하는 위 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.<br />
            * <strong>필수 항목 동의 거부 시:</strong> 서비스의 본질적인 기능(회원가입, 스케줄 관리, 급여 정산 등) 제공이 불가능하므로 <strong>회원가입 및 서비스 이용이 제한</strong>됩니다.<br />
            * <strong>선택 항목 동의 거부 시:</strong> 동의하지 않으셔도 기본적인 서비스 이용에는 불이익이 없으나, 이메일 공지 등의 <strong>일부 부가 기능 이용이 제한</strong>될 수 있습니다.
          </p>

          <div className="mt-5 pt-4 border-top">
            <p className="small text-muted mb-1">
              <strong>시행일:</strong> 2026년 09월 26일
            </p>
            <p className="small text-muted mb-0">
              <strong>버전:</strong> v1.0
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

export default ConsentPolicy;
