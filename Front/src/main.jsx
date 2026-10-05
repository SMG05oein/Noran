import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './components/ui/ui.css'
import App from './App.jsx'
import axios from 'axios'

axios.defaults.withCredentials = true;

// 구버전 JS 캐싱으로 인한 ChunkLoadError(화이트 화면) 발생 시 자동 새로고침 처리
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || '';
  const name = event.reason?.name || '';
  if (
    name === 'ChunkLoadError' ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed')
  ) {
    console.warn('ChunkLoadError 감지됨. 최신 모듈을 가져오기 위해 새로고침합니다.');
    window.location.reload();
  }
});

window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.includes('ChunkLoadError') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed')
  ) {
    console.warn('ChunkLoadError 감지됨. 최신 모듈을 가져오기 위해 새로고침합니다.');
    window.location.reload();
  }
});
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
