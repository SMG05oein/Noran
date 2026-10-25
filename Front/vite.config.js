import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import packageJson from './package.json'

const appVersion = `v${packageJson.version}`

/** dist/assets/version.json — fetch('/assets/version.json') 로 구버전 감지 */
function versionJsonPlugin() {
  return {
    name: 'generate-version-json',
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir || resolve(process.cwd(), 'dist')
      const assetsDir = resolve(outDir, 'assets')
      mkdirSync(assetsDir, { recursive: true })
      writeFileSync(
        resolve(assetsDir, 'version.json'),
        JSON.stringify({
          version: appVersion,
          buildTime: new Date().toISOString(),
        })
      )
    },
  }
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
  },
  plugins: [
    react(),
    versionJsonPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'pig.png'],
      workbox: {
        // index.html은 navigateFallback용으로 프리캐시에 있어야 함 (제외 시 non-precached-url)
        globIgnores: ['**/assets/version.json'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/version\.json$/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: '노란돼지 근무관리',
        short_name: '노란돼지',
        description: '노란돼지 알바생 및 직원 출퇴근 및 근무 신청 앱',
        theme_color: '#FBBF24',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pig.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
              return 'vendor-monaco'
            }
            if (id.includes('xlsx-js-style') || id.includes('/xlsx/') || id.includes('\\xlsx\\')) {
              return 'vendor-xlsx'
            }
            if (id.includes('html2canvas') || id.includes('html-to-image')) {
              return 'vendor-capture'
            }
            if (id.includes('date-holidays')) {
              return 'vendor-holidays'
            }
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('/react/') ||
              id.includes('\\react\\')
            ) {
              return 'vendor-react'
            }
            if (id.includes('bootstrap') || id.includes('react-bootstrap')) {
              return 'vendor-bootstrap'
            }
            return 'vendor'
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/swagger-ui': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/v3/api-docs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
