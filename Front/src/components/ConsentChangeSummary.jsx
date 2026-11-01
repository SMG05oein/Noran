/** 재동의 시 개정 요약만 보여 줄 때 사용 */

const SUMMARIES = {
  privacy: {
    version: 'v2.1',
    date: '2026-11-01',
    title: '개인정보처리방침 변경 요약',
    bullets: [
      '개정 사유: 근무 관련 웹 푸시 알림(선택) 기능 도입에 따라 수집 항목 및 보유 기준을 정비했습니다.',
      '수집 항목 추가: (선택) 웹 푸시 구독 정보(endpoint, keys)가 추가되었습니다.',
      '보유 및 파기: 알림 기능 해제 또는 퇴사·탈퇴 시 지체 없이 파기합니다.',
    ],
  },
  consent: {
    version: 'v2.1',
    date: '2026-11-01',
    title: '개인정보 수집·이용 동의 변경 요약',
    bullets: [
      '개정 사유: 근무 관련 웹 푸시 알림(선택) 기능 도입에 따라 수집 항목을 추가 고지합니다.',
      '선택 항목 안내: 웹 푸시 알림은 선택 사항이며, 동의하지 않으셔도 기본 서비스 이용에 불이익이 없습니다.',
      '보유 및 파기: 알림 해제 또는 퇴사·탈퇴 시 지체 없이 파기합니다.',
    ],
  },
  terms: {
    version: 'v1.1',
    date: '2026-11-01',
    title: '근태관리시스템 이용규정 변경 요약',
    bullets: [
      '개정 사유: 근무 관련 웹 푸시 알림(선택) 기능 도입을 이용규정에 반영했습니다.',
      '알림 정책: 알림의 종류(근무 기록 누락 안내, 근무 배정 확정, 근무 신청 마감 안내)와 자율적 설정 권한을 명시했습니다.',
      '불이익 없음: 웹 푸시 알림 미사용으로 인한 불이익은 없습니다.',
    ],
  },
};

const ConsentChangeSummary = ({ type }) => {
  const summary = SUMMARIES[type] || SUMMARIES.terms;

  return (
    <div className="mb-0">
      <div className="d-flex flex-wrap align-items-baseline gap-2 mb-3">
        <h5 className="fw-bold mb-0 text-dark">{summary.title}</h5>
        <span className="small text-muted">{summary.version} · {summary.date}</span>
      </div>
      <p className="small text-muted mb-3">
        이번에 바뀐 내용만 정리했습니다. 아래 <strong>전문 보기</strong>에서 전체 문서를 확인할 수 있습니다.
      </p>
      <ul className="small mb-0 ps-3" style={{ lineHeight: 1.7 }}>
        {summary.bullets.filter(Boolean).map((item) => (
          <li key={item} className="mb-2">{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default ConsentChangeSummary;
