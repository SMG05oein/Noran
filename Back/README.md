# Dwaeji Backend

근무 신청·스케줄, 근무 기록, 급여, 회원, 커뮤니티(모임), 개발자 대시보드를 제공하는 Spring Boot API 서버입니다.

## 기술 스택

| 항목 | 버전 / 라이브러리 |
| --- | --- |
| Java | 21 |
| Spring Boot | 4.1.0 |
| Gradle | Wrapper (`./gradlew`) |
| DB | MySQL (JPA / Hibernate) |
| 인증 | Spring Security + JWT |
| API 문서 | springdoc OpenAPI (`/swagger`) |
| 기타 | Lombok, Bean Validation, JavaMail, Apache POI, JSch |

기본 포트는 `8080`입니다. Swagger UI는 `http://localhost:8080/swagger` 에서 확인할 수 있습니다.

## 실행 전 준비

- JDK 21
- MySQL
- 아래 환경 변수

필수 값은 환경 변수로 주입합니다. 저장소에 실제 키나 비밀번호를 넣지 마세요.

| 변수 | 용도 |
| --- | --- |
| `DB_URL` | JDBC URL (`jdbc:mysql://...`) |
| `DB_USERNAME` | DB 계정 |
| `DB_PASSWORD` | DB 비밀번호 |
| `MAIL_USERNAME` | SMTP(Gmail) 계정 |
| `MAIL_PASSWORD` | SMTP 앱 비밀번호 |
| `AES_SECRET_KEY` | AES-256 키 (32바이트) |
| `JWT_SECRET` | JWT HMAC 시크릿 (최소 32바이트) |
| `DB_EXECUTOR_ID` | 개발자 대시보드 SQL 실행 계정 ID |
| `DB_EXECUTOR_PW` | 개발자 대시보드 SQL 실행 계정 비밀번호 |

선택 값:

| 변수 | 기본값 | 용도 |
| --- | --- | --- |
| `DEV_ALLOWED_IPS` | 직접 설정 | 개발자 API IP 허용 목록 (쉼표 구분, 예: `127.0.0.1`) |
| `DEV_IP_OTP_TO` | `MAIL_USERNAME` | IP 불일치 시 OTP 수신 메일 |
| `GIT_SHA` | `unknown` | 빌드 SHA |
| `BUILD_TIME` | 비어 있음 | 빌드 시각 |
| `ALERT_EMAIL_TO` | `MAIL_USERNAME` | 운영 알림 수신 메일 (비우면 mail/OTP 수신과 동일) |
| `ALERT_WEBHOOK_URL` | 비어 있음 | Discord/Slack 알림 (선택, 이메일과 병행 가능) |
| `BACKEND_DEPLOY_WEBHOOK_URL` | 비어 있음 | 백엔드 재배포 웹훅 (선택, 보통 `deploy.sh` 사용) |
| `BACKEND_DEPLOY_STATUS_URL` | 비어 있음 | 배포 상태 조회 URL (선택) |

Hibernate `ddl-auto`는 `update`입니다. 애플리케이션 기동 시 엔티티 기준으로 스키마가 반영됩니다.

## 실행

```bash
./gradlew bootRun
```

Windows:

```powershell
.\gradlew.bat bootRun
```

테스트:

```bash
./gradlew test
```

## 인증

대부분의 API는 `Authorization: Bearer <액세스 토큰>` 이 필요합니다. 세션은 `STATELESS`입니다.

### 회원 토큰 흐름

| 토큰 | 전달 방식 | 수명 |
| --- | --- | --- |
| Access | JSON body + `Authorization` 헤더 | 20분 |
| Refresh | **HttpOnly 쿠키만** (`refreshToken`). 응답 body에는 포함하지 않음 | 자동로그인 ON **30일** / OFF·미전달 **7일** |

- `POST /api/user/login` body: `{ "userId", "userPw", "autoLogin" }`  
  - `autoLogin: true` → RT 30일, `false`/`null` → RT 7일  
  - 성공 시 액세스 토큰은 body, 리프레시는 `Set-Cookie` (HttpOnly, Secure, SameSite=None)
- `POST /api/user/refresh`  
  - 쿠키의 RT로 검증 후 **액세스 + 리프레시 모두 재발급**(로테이션)  
  - 만료는 **JWT `exp`만** 판정. DB `rf_expiry_date`는 행 정리·슬롯 관리용  
  - RT JWT의 `ttlDays` 클레임으로 로그인 시 TTL(30/7)을 유지하며 슬라이딩 연장  
  - 새 RT는 다시 HttpOnly 쿠키로만 전달 (`withCredentials` 필요)
- 계정당 활성 리프레시 세션(기기) **최대 3개**. 로그인 시 만료 행 정리 후, 초과하면 가장 오래된 세션부터 삭제  

### 인증 없이 호출 가능한 경로

- `POST /api/user/login`
- `POST /api/user/signup`
- `POST /api/user/refresh`
- `GET /api/work-place/all`
- `GET /api/banks`
- `POST /api/dev/auth/login`
- `POST /api/dev/auth/ip-otp/request`
- `POST /api/dev/auth/ip-otp/verify`
- `GET /api/dev/announcements/public`
- `GET /api/dev/announcements/maintenance-status`

개발자 API(`/api/dev/**`)는 허용 IP 목록을 확인합니다. IP가 맞지 않으면 OTP를 요청·검증한 뒤 `X-Dev-Ip-Token` 헤더로 세션을 이어갑니다. 점검 상태·공개 공지는 IP 검사에서 제외됩니다.

## API 구성

| 경로 | 설명 |
| --- | --- |
| `/api/user` | 로그인, 회원가입, 회원 정보, 관리자, 비밀번호, 계좌 |
| `/api/user-types` | 회원 유형 CRUD |
| `/api/banks` | 은행 목록 |
| `/api/work-place` | 근무지 CRUD |
| `/api/work-schedule` | 근무 신청·스케줄, 일/주/월 조회 |
| `/api/work-record` | 근무 기록, 이력, 엑셀 다운로드·대조 |
| `/api/payroll` | 급여 조회·엑셀 |
| `/api/dev/auth` | 개발자 로그인, IP OTP, 비밀번호 변경 |
| `/api/dev/dashboard` | 시스템 정보, 헬스, 재시작·종료·재배포 |
| `/api/dev/database` | 스키마 조회, SQL 실행, 감사 로그 |
| `/api/dev/logs` | 로그 조회·다운로드 |
| `/api/dev/analytics` | 트래픽·느린 엔드포인트·상태 코드 분포 |
| `/api/dev/announcements` | 공지·점검 모드 |
| `/api/dev/alerts` | 알림 설정·테스트 |

운영은 OCI 단일 호스트(Front + API + MySQL)이며, JAR 배포는 서버의 `deploy.sh` / `watch_deploy.sh`를 사용합니다.

요청·응답 스키마는 Swagger에서 확인합니다. 개발자 대시보드 상세는 `developer-dashboard-api.md`, 근무기록 엑셀 대조 시나리오는 `excel-compare-qa.md`를 참고하세요.

## 패키지 구조

```
src/main/java/com/recode/Dwaeji
├── user              회원, 근무지, 은행, 회원 유형
├── work_apply_work   근무 신청·일별 스케줄
├── work_record       근무 기록·엑셀 대조
├── payroll           급여
├── developer         개발자 대시보드
├── common            예외, 엑셀 테마, 인터셉터
└── policy            Spring Security 설정
```

## 관련 설정

`src/main/resources/application.properties` 에서 조정할 수 있는 값:

- 근무기록 수정 기한: `work-record.edit-deadline-day-of-month`, `work-record.edit-deadline-time` (근무월 다음 달 해당 일·시각)
- 개발자 IP OTP: 유효 시간, 세션 유지 시간, 재발송 간격
- 리소스 알림 임계값: 메모리 사용률, 디스크 여유, 5xx 증가량, 점검 주기, 쿨다운
