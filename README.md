# 🐷 Dwaeji (돼지) - 근태 관리 시스템

출퇴근 및 근무 기록을 관리하는 풀스택 웹 애플리케이션입니다.

## 기술 스택

### Backend
| 항목 | 기술 |
|------|------|
| Language | Java 21 |
| Framework | Spring Boot 4.1.0 |
| ORM | Spring Data JPA |
| Security | Spring Security + JWT |
| Database | MySQL |
| Build | Gradle |
| API 문서 | Springdoc OpenAPI (Swagger) |
| Excel | Apache POI |

### Frontend
| 항목 | 기술 |
|------|------|
| Language | JavaScript |
| Framework | React 19 |
| Build | Vite 8 |
| Routing | React Router v7 |
| State | Zustand |
| UI | React Bootstrap |
| HTTP | Axios |

## 디렉토리 구조

```
Noran/
├── Back/                         # Spring Boot 백엔드
│   ├── src/main/java/com/recode/Dwaeji/
│   │   ├── user/                 # 사용자 관리
│   │   ├── work_record/          # 근무 기록
│   │   ├── work_apply_work/      # 근무 신청
│   │   ├── policy/               # 정책 관리
│   │   └── common/               # 공통 모듈
│   └── build.gradle
├── Front/                        # React 프론트엔드
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 시작하기

### 사용 기술 스택
- Java 21
- Node.js 18+
- MySQL 8.0+

### Backend 실행
```bash
cd Back
./gradlew bootRun
```

### Frontend 실행
```bash
cd Front
npm install
npm run dev
```

## 배포

[노란돼지 출퇴근 및 근무관리 시스템](https://dweaji.netlify.app/login)

