import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import useThemeStore from './store/useThemeStore';
import { fetchMyInfo, refreshAccessToken } from './api/authApi';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Main from './pages/Main';
import useVerifyUser from './hooks/useVerifyUser';
import Records from './pages/Records';
import Requests from './pages/Requests';
import ConsentPolicy from './pages/ConsentPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SystemUsagePolicy from './pages/SystemUsagePolicy';
import GNB from './components/GNB';
import AdminGNB from './components/AdminGNB';
import BottomNav from './components/BottomNav';
import AdminBottomNav from './components/AdminBottomNav';
import Footer from './components/Footer';
import AdminMain from './pages/AdminMain';
import AdminUsers from './pages/AdminUsers';
import AdminRecords from './pages/AdminRecords';
import AdminWorkPlaces from './pages/AdminWorkPlaces';
import AdminUserTypes from './pages/AdminUserTypes';
import NotFound from './pages/NotFound';
import AdminWeeklyAssign from './pages/AdminWeeklyAssign';
import RecordEdit from './pages/RecordEdit';
import RequestEdit from './pages/RequestEdit';
import MyPage from './pages/MyPage';
import DevLogin from './pages/DevLogin';
import DevMain from './pages/DevMain';
import DevRoute from './components/DevRoute';
import NoticeModal from './components/NoticeModal';
import Loading from './components/Loading';
import './App.css';
import Joke from "./pages/Joke.jsx";

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
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.isAdmin !== 1) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="app-layout">
      <AdminGNB />
      <div className="content-wrapper">
        {children}
      </div>
      <div className="pb-5 pb-lg-0 w-100">
        <Footer />
      </div>
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

  if (isInitializing) {
    return <div className="d-flex justify-content-center align-items-center vh-100"><Loading /></div>;
  }

  return (
    <>
      <NoticeModal />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/consent" element={<ConsentPolicy />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<SystemUsagePolicy />} />
        <Route path="/eee" element={<Joke />} />

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
        <Route path="/requests/edit" element={<ProtectedRoute><RequestEdit /></ProtectedRoute>} />
        <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
        <Route path="/admin/weekly-assign" element={<AdminRoute><AdminWeeklyAssign /></AdminRoute>} />
        <Route path="/admin/employees" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/records" element={<AdminRoute><AdminRecords /></AdminRoute>} />
        <Route path="/admin/workplaces" element={<AdminRoute><AdminWorkPlaces /></AdminRoute>} />
        <Route path="/admin/user-types" element={<AdminRoute><AdminUserTypes /></AdminRoute>} />
        <Route path="/admin/mypage" element={<AdminRoute><MyPage /></AdminRoute>} />

        {/* 개발자 전용 라우트 */}
        <Route path="/dev/login" element={<DevLogin />} />
        <Route element={<DevRoute />}>
          <Route path="/dev/dashboard" element={<DevMain />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
