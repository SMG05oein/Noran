// 버전 상수 정의
// 1. vite.config.js에서 package.json 버전을 import.meta.env.VITE_APP_VERSION 에 자동 주입
// 2. 환경변수 파일(.env)에 별도 정의된 경우 해당 값 우선
// 3. 없을 경우 기본 fallback 'v0.9.10'
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'v0.9.10';
