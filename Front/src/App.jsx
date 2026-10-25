import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import useThemeStore from './store/useThemeStore';
import useVerifyUser from './hooks/useVerifyUser';
import AppUpdateWatcher from './components/AppUpdateWatcher';
import GNB from './components/GNB';
import AdminGNB from './components/AdminGNB';
import BottomNav from './components/BottomNav';
import AdminBottomNav from './components/AdminBottomNav';
import Footer from './components/Footer';
import DevRoute from './components/DevRoute';
import NoticeModal from './components/NoticeModal';
import DevIpOtpGate from './components/DevIpOtpGate';
import Loading from './components/Loading';
import PwaInstallBanner from './components/PwaInstallBanner';
import ServerDownOverlay from './components/ServerDownOverlay';
import GlobalConsentGuard from './components/GlobalConsentGuard';
import './App.css';

const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const Main = React.lazy(() => import('./pages/Main'));
const Records = React.lazy(() => import('./pages/Records'));
const Requests = React.lazy(() => import('./pages/Requests'));
const ConsentPolicy = React.lazy(() => import('./pages/ConsentPolicy'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const SystemUsagePolicy = React.lazy(() => import('./pages/SystemUsagePolicy'));
const AdminMain = React.lazy(() => import('./pages/AdminMain'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminRecords = React.lazy(() => import('./pages/AdminRecords'));
const AdminExcelCompare = React.lazy(() => import('./pages/AdminExcelCompare'));
const AdminPayroll = React.lazy(() => import('./pages/AdminPayroll'));
const AdminWorkPlaces = React.lazy(() => import('./pages/AdminWorkPlaces'));
const AdminUserTypes = React.lazy(() => import('./pages/AdminUserTypes'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const AdminWeeklyAssign = React.lazy(() => import('./pages/AdminWeeklyAssign'));
const RecordEdit = React.lazy(() => import('./pages/RecordEdit'));
const MyPage = React.lazy(() => import('./pages/MyPage'));
const DevLogin = React.lazy(() => import('./pages/DevLogin'));
const DevMain = React.lazy(() => import('./pages/DevMain'));
const Joke = React.lazy(() => import('./pages/Joke.jsx'));
const PigGathering = React.lazy(() => import('./pages/PigGathering.jsx'));
const AdminBoard = React.lazy(() => import('./pages/AdminBoard.jsx'));
const HowToUse = React.lazy(() => import('./pages/HowToUse.jsx'));

const PageFallback = (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <Loading />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.isAdmin === 1) {
    return <Navigate to="/admin" replace />;
  }
  return (
    <div className="app-layout">
      <GNB />
      <div className="content-wrapper">
        {children}
      </div>
      <div className="pb-5 pb-lg-0 w-100">
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.isAdmin !== 1) {
    return <Navigate to="/" replace />;
  }
  const hideFooter = location.pathname.startsWith('/admin/weekly-assign');
  return (
    <div className="app-layout">
      <AdminGNB />
      <div className="content-wrapper">
        {children}
      </div>
      {!hideFooter && (
        <div className="pb-5 pb-lg-0 w-100">
          <Footer />
        </div>
      )}
      <AdminBottomNav />
    </div>
  );
};

function App() {
  const { isAuthenticated, user, login, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { isInitializing } = useVerifyUser();
  // HTML의 data-bs-theme 속성을 테마 상태와 동기화
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  // 카카오톡 인앱 브라우저 감지 시 외부 브라우저로 자동 연결
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.match(/kakaotalk/i)) {
      window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(window.location.href);
    }
  }, []);

  if (isInitializing) {
    return PageFallback;
  }

  return (
    <>
      <AppUpdateWatcher />
      <PwaInstallBanner />
      <NoticeModal />
      <ServerDownOverlay />
      <GlobalConsentGuard />
      <DevIpOtpGate />
      <Suspense fallback={PageFallback}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/consent" element={<ConsentPolicy />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<SystemUsagePolicy />} />
          <Route path="/eee" element={<Joke />} />
          <Route path="/gathering" element={<PigGathering />} />
          <Route path="/howtouse" element={<HowToUse />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Main />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminMain />
              </AdminRoute>
            }
          />
          <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
          <Route path="/records/edit" element={<ProtectedRoute><RecordEdit /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
          <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
          <Route path="/admin/weekly-assign" element={<AdminRoute><AdminWeeklyAssign /></AdminRoute>} />
          <Route path="/admin/employees" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/records" element={<AdminRoute><AdminRecords /></AdminRoute>} />
          <Route path="/admin/records/excel-compare" element={<AdminRoute><AdminExcelCompare /></AdminRoute>} />
          <Route path="/admin/payroll" element={<AdminRoute><AdminPayroll /></AdminRoute>} />
          <Route path="/admin/workplaces" element={<AdminRoute><AdminWorkPlaces /></AdminRoute>} />
          <Route path="/admin/user-types" element={<AdminRoute><AdminUserTypes /></AdminRoute>} />
          <Route path="/admin/board" element={<AdminRoute><AdminBoard /></AdminRoute>} />
          <Route path="/admin/mypage" element={<AdminRoute><MyPage /></AdminRoute>} />

          {/* 개발자 전용 라우트 */}
          <Route path="/dev/login" element={<DevLogin />} />
          <Route element={<DevRoute />}>
            <Route path="/dev/dashboard" element={<DevMain />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
