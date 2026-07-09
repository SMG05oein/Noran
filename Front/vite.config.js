import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'pig.png'], // 캐싱할 파일명 업데이트
      manifest: {
        name: '노란돼지 근무관리',
        short_name: '노란돼지',
        description: '노란돼지 알바생 및 직원 출퇴근 및 근무 신청 앱',
        theme_color: '#FBBF24',
        background_color: '#ffffff',
        display: 'standalone',

        // 🌟 여기가 핵심입니다! pig.png 하나로 퉁치기
        icons: [
          {
            src: 'pig.png',
            sizes: '192x192 512x512', // 띄어쓰기로 여러 사이즈 동시 지정 가능
            type: 'image/png',
            purpose: 'any maskable' // 안드로이드, 아이폰 화면에 맞게 꽉 차게 조절
          }
        ]
      }
    }),
    {
      name: 'generate-redirects',
      closeBundle() {
        // 환경 변수에서 API URL을 가져옵니다.
        const apiUrl = process.env.VITE_API_URL || 'http://localhost:8080';
        const content = `# 1. API 프록시 우회 (Mixed Content 해결)\n/api/* ${apiUrl}/api/:splat  200\n\n# 2. React Router 새로고침 시 404 에러 방지 (SPA 필수 설정)\n/* /index.html  200`;
        try {
          fs.writeFileSync('dist/_redirects', content);
          console.log('✅ _redirects 파일이 성공적으로 생성되었습니다. (API:', apiUrl, ')');
        } catch (e) {
          console.error('_redirects 파일 생성 중 오류:', e);
        }
      }
    }
  ]
})