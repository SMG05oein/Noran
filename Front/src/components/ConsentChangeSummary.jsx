/** 재동의 시 개정 요약만 보여 줄 때 사용 */

const SUMMARIES = {
  privacy: {
    version: 'v1.1',
    date: '2026-10-22',
    title: '개인정보처리방침 변경 요약',
    bullets: [
      '서버를 Oracle Cloud Infrastructure(일본 오사카 리전)로 이전함에 따라, 개인정보 처리위탁(3조)을 추가했습니다.',
      '개인정보의 국외 이전(5조)을 “이전하지 않음”에서 일본(오사카) OCI 보관·호스팅으로 변경했습니다.',
      '이전 항목은 서비스에서 수집·처리하는 개인정보 전부이며, 보유기간은 기존과 동일합니다.',
    ],
  },
  consent: {
    version: 'v1.1',
    date: '2026-10-22',
    title: '개인정보 수집·이용 동의 변경 요약',
    bullets: [
      '국외 이전(일본 오사카, Oracle Cloud) 고지를 필수 동의 항목으로 추가했습니다.',
      '동의 거부 시 회원가입 및 서비스 이용이 제한될 수 있습니다.',
    ],
  },
  terms: {
    version: 'v1.0',
    date: '2026-09-26',
    title: '이용규정',
    bullets: [
      '',
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
        {summary.bullets.map((item) => (
          <li key={item} className="mb-2">{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default ConsentChangeSummary;
