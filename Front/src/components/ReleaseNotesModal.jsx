import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';

const releaseHistory = [
  {
    version: '0.9.9',
    date: '2026-10-03',
    features: [
      '퇴사자 개인정보 자동 마스킹 및 정보 수정 차단',
      '개인정보처리방침 및 이용규정 등 정책 문서 최신화',
      '기타 사소한 UI 개선 및 버그 수정'
    ],
    fixes: []
  },
  {
    version: '0.9.8',
    date: '2026-09-29',
    features: [
      '애플리케이션 버전 관리 도입 및 화면 표시',
      '배포 서버 정책에 맞춘 API 메서드 최적화',
      '시스템 안내 가이드 및 앱 이름 표기 고정'
    ],
    fixes: [
      '링크 및 기타 사소한 배포 환경 오류 수정'
    ]
  },
  {
    version: '0.9.7',
    date: '2026-09-28',
    features: [
      'PWA(웹 앱) 설치 안내 팝업 추가',
      '근무 신청 기능 고도화',
      '서버 SSL 인증서 설치에 따른 통신 규칙 강화',
      '대용량 엑셀 등록 시 메모리 최적화'
    ],
    fixes: [
      '리프레시 토큰 기한 연장 오류 해결',
      '일부 배포 API 엔드포인트 수정'
    ]
  },
  {
    version: '0.9.6',
    date: '2026-09-27',
    features: [
      '카카오톡 인앱 브라우저에서 열릴 때 외부 브라우저로 리다이렉트',
      '근무 기록 엑셀 일괄 등록 및 덮어쓰기 로직 추가',
      '유저 아카이빙 정책 변경 반영',
      '관리자용 주간 배정 이미지 다운로드 삭제'
    ],
    fixes: [
      '유저 삭제 시 DB 내부 로직으로 인한 충돌 오류 해결',
      '근무지 삭제 로직 문제 수정'
    ]
  },
  {
    version: '0.9.5',
    date: '2026-09-24',
    features: [
      '개발자 대시보드 고도화 및 보안 강화',
      '노란돼지 사내 커뮤니티 오픈',
      '급여 관리 기능 및 UI 신규 추가',
      '스케줄 배정 휴직 직원 판별 가능하도록 개선'
    ],
    fixes: [
      '동명이인 처리 기준 변경',
      '근무기록 생성 및 스케줄러 배정 시 치명적 오류 해결'
    ]
  },
  {
    version: '0.9.0',
    date: '2026-09-22',
    features: [
      '대규모 QA 진행 및 피드백 전면 반영',
      '근무 신청 및 스케줄 배정 분리 고도화',
      '은행코드 및 마이페이지 회원정보 수정 기능 도입',
      '전체적인 디자인 수정 및 동적 뷰 적용'
    ],
    fixes: [
      '하루 다수 지점 근무 오류 해결 및 프론트 로직 개선'
    ]
  },
  {
    version: '0.8.0',
    date: '2026-08-31',
    features: [
      '전면적인 디자인 리뉴얼 및 다크모드 도입',
      '캘린더 UI 테마 개선 및 관리자용 주간 배정 이미지 다운로드 기능 추가',
      '타 지점 근무 파견 기능 및 관리자 근무 기록 변경 로그 도입',
      'API 캐시 처리로 프론트엔드 성능 대폭 최적화'
    ],
    fixes: [
      '날짜 포함된 기록 조회 오류 등 비효율적인 DB 쿼리 전면 리팩토링'
    ]
  },
  {
    version: '0.7.0',
    date: '2026-08-27',
    features: [
      '직급(UserType) 개념 도입 및 개인정보 보호법 의거 은행/계좌정보 체계 구축',
      '페이징 바 컴포넌트 추가 및 UX 최적화',
      '동명이인 정렬 로직 및 관리자 메인 페이지 추가'
    ],
    fixes: [
      'DTO 불필요 어노테이션 제거 및 리프레시 토큰 웹 정책 변경'
    ]
  },
  {
    version: '0.1.0',
    date: '2026-07-10',
    features: [
      '노란돼지 근태관리시스템 뼈대 구축',
      '개발자 대시보드 기초 및 초기 UI 기반 오픈',
      '로그인/회원가입 기반 보안 처리 적용'
    ],
    fixes: [
      '배포 환경 404 및 라우팅 렌더링 문제 해결'
    ]
  }
];

const ReleaseNotesModal = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} centered scrollable size="lg">
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="fw-bold">
          🎉 업데이트 내역 (Release Notes)
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light px-4 py-4">
        {releaseHistory.map((release, idx) => (
          <div key={release.version} className="bg-white p-4 rounded-4 shadow-sm mb-4 border">
            <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold mb-0 text-primary">v{release.version}</h5>
                {idx === 0 && <Badge bg="success" className="rounded-pill">최신</Badge>}
              </div>
              <div className="text-muted small fw-bold">{release.date}</div>
            </div>

            {release.features && release.features.length > 0 && (
              <div className="mb-3">
                <div className="fw-bold text-dark mb-2 small">✨ 신규 기능 및 개선사항</div>
                <ul className="text-muted small mb-0" style={{ paddingLeft: '1.2rem' }}>
                  {release.features.map((item, i) => (
                    <li key={i} className="mb-1">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {release.fixes && release.fixes.length > 0 && (
              <div>
                <div className="fw-bold text-dark mb-2 small">🐛 버그 수정</div>
                <ul className="text-muted small mb-0" style={{ paddingLeft: '1.2rem' }}>
                  {release.fixes.map((item, i) => (
                    <li key={i} className="mb-1">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        <div className="text-center text-muted small mt-4">
          더 나은 서비스를 위해 계속 업데이트 중입니다. 감사합니다!
        </div>
      </Modal.Body>
      <Modal.Footer className="border-top">
        <Button variant="secondary" onClick={onHide} className="fw-bold px-4">
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ReleaseNotesModal;
