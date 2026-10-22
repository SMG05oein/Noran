/** 재동의 시 개정 요약만 보여 줄 때 사용 */

const SUMMARIES = {
  privacy: {
    version: 'v2.0',
    date: '2026-10-22',
    title: '개인정보처리방침 변경 요약',
    bullets: [
      '개정 사유: 서버를 일본(오사카) Oracle Cloud로 이전하면서 개인정보가 국외에 보관·처리됩니다.',
      '안전조치(8조)를 클라우드 기준(계정·접근키 관리, 네트워크 접근 제한 등)으로 수정했습니다.',
    ],
  },
  consent: {
    version: 'v2.0',
    date: '2026-10-22',
    title: '개인정보 수집·이용 동의 변경 요약',
    bullets: [
      '개정 사유: 일본(오사카) Oracle Cloud 이전으로 국외 이전이 발생하여 필수 동의로 고지합니다.',
      '재동의 사유: 국외 이전은 동의 사항이므로 기존 회원에게도 동의를 다시 받습니다.',
    ],
  },
  terms: {
    version: 'v1.0',
    date: '2026-09-26',
    title: '이용규정',
    bullets: [
      '이번 서버 이전으로 이용규정 본문은 변경되지 않았습니다. 재동의가 필요한 경우 전문을 확인해 주세요.',
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
