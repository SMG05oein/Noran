# 노란돼지 프론트엔드

[노란돼지](https://github.com/SMG05oein/Noran)의 직원·관리자 화면입니다.  
출퇴근, 근무 기록, 근무 신청, 급여, 주간 배치를 다루며, 홈 화면에 추가할 수 있는 PWA로 동작합니다.

배포 주소: [dweaji.netlify.app](https://dweaji.netlify.app/login)

백엔드는 같은 저장소의 [`Back`](../Back) 입니다. 백엔드 API 기본 주소는 `http://localhost:8080` 입니다.

## 기술 스택

- React 19, React Router 7
- Vite 8
- Bootstrap 5, react-bootstrap
- Zustand, Axios
- vite-plugin-pwa

## 시작하기

Node.js 18 이상이 필요합니다.

```bash
cd Front
npm install
npm run dev
```

개발 서버는 `http://localhost:5173` 에서 열립니다.  
`/api` 요청은 `http://localhost:8080` 으로 프록시됩니다.

백엔드 주소가 다르면 `Front/.env.local` 에 아래 값을 넣습니다.

```
VITE_API_URL=http://localhost:8080
```

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint |

## 화면

로그인 후 직원은 본인 근무를 보고, 관리자는 `/admin` 으로 이동합니다.

| 경로 | 화면 |
| --- | --- |
| `/login`, `/signup` | 로그인, 회원가입 |
| `/` | 월간 근무 캘린더 |
| `/records` | 근무 기록 |
| `/requests` | 근무 신청 |
| `/mypage` | 마이페이지 |
| `/admin` | 관리자 홈 |
| `/admin/weekly-assign` | 주간 배치 |
| `/admin/employees` | 직원 |
| `/admin/records` | 근무 기록 |
| `/admin/payroll` | 급여 |
| `/admin/workplaces` | 근무지 |
