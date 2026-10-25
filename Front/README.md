# 노란돼지 프론트엔드

[노란돼지](https://github.com/SMG05oein/Noran)의 직원·관리자 웹 앱입니다.  
출퇴근·근무 기록·근무 신청·급여·주간 배치를 다루며, PWA로 홈 화면에 설치할 수 있습니다.

| | |
| --- | --- |
| 서비스 | https://dwaeji.kr |
| API | https://api.dwaeji.kr |
| 현재 버전 | `0.9.18` (`package.json`) |

백엔드는 같은 저장소의 [`Back`](../Back) 입니다. 로컬 API 기본 주소는 `http://localhost:8080` 입니다.

## 기술 스택

- React 19, React Router 7, Vite 8
- Bootstrap 5, react-bootstrap
- Zustand, Axios
- vite-plugin-pwa
- Recharts, xlsx (관리자·통계·엑셀)

## 시작하기

Node.js 18 이상이 필요합니다.

```bash
cd Front
npm install
npm run dev
```

개발 서버: `http://localhost:5173`  
`/api` 요청은 `http://localhost:8080` 으로 프록시됩니다.

백엔드 주소가 다르면 `Front/.env.local` 에 설정합니다.

```
VITE_API_URL=http://localhost:8080
```

프로덕션 빌드는 `.env.production` 의 `VITE_API_URL`(기본 `https://api.dwaeji.kr`)을 사용합니다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (`dist/`, `_redirects` 생성, `assets/version.json` 포함) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint |
| `npm version patch` | 패치 버전 올림 → 빌드·배포 시 클라이언트 자동 갱신에 사용 |

## 배포

1. 필요 시 `npm version patch` 로 버전을 올린다.
2. `npm run build`
3. `dist/` 내용을 웹 루트에 배포한다.

배포 후 `/assets/version.json` 에 빌드 버전이 있어야 합니다.  
이미 열린 탭/PWA는 백그라운드에서 다시 보일 때 버전을 비교하고, 다르면 업데이트 안내 후 새로고침합니다.

개발에서 업데이트 배너 UI만 보려면: `http://localhost:5173/?debug_update=1`

## 화면

로그인 후 직원은 본인 근무를, 관리자는 `/admin` 으로 이동합니다.

### 공통·직원

| 경로 | 화면 |
| --- | --- |
| `/login`, `/signup` | 로그인, 회원가입 |
| `/` | 월간 근무 캘린더 |
| `/records`, `/records/edit` | 근무 기록 |
| `/requests` | 근무 신청 |
| `/mypage` | 마이페이지 |
| `/gathering` | 돼지들 모임(게시판) |
| `/howtouse` | 시스템 이용방법 |
| `/privacy` | 개인정보처리방침 |
| `/terms` | 시스템 이용규정 |
| `/consent` | 개인정보 수집·이용 동의서 |

### 관리자

| 경로 | 화면 |
| --- | --- |
| `/admin` | 관리자 홈 |
| `/admin/weekly-assign` | 주간 배치 |
| `/admin/employees` | 직원 |
| `/admin/records` | 근무 기록 |
| `/admin/records/excel-compare` | 엑셀 대조 |
| `/admin/payroll` | 급여 |
| `/admin/workplaces` | 근무지 |
| `/admin/user-types` | 직급 |
| `/admin/board` | 게시판 관리 |
| `/admin/mypage` | 마이페이지 |

### 개발자 콘솔

| 경로 | 화면 |
| --- | --- |
| `/dev/login` | 개발자 로그인 |
| `/dev/dashboard` | 운영 콘솔 (현황·로그·API 통계·공지·IP) |

## 최근 업데이트 (v0.9.18)

- 자동 로그인 선택 시 로그인 유지 30일 / 미선택 시 7일
- 배포 후 구버전 클라이언트 자동 감지·새로고침
