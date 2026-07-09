import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
    })
  ]
})