import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import { fetchMyInfo, refreshAccessToken } from './api/authApi';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Main from './pages/Main';
import Records from './pages/Records';
import Requests from './pages/Requests';
import GNB from './components/GNB';
import AdminGNB from './components/AdminGNB';
import BottomNav from './components/BottomNav';
import AdminBottomNav from './components/AdminBottomNav';
import AdminMain from './pages/AdminMain';
import AdminUsers from './pages/AdminUsers';
import AdminRecords from './pages/AdminRecords';
import AdminWorkPlaces from './pages/AdminWorkPlaces';
import AdminWeeklyAssign from './pages/AdminWeeklyAssign';
import RecordEdit from './pages/RecordEdit';
import RequestEdit from './pages/RequestEdit';
import MyPage from './pages/MyPage';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="app-layout">
      <GNB />
      <div className="content-wrapper pb-5 pb-lg-0">
        {children}
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
      <div className="content-wrapper pb-5 pb-lg-0">
        {children}
      </div>
      <AdminBottomNav />
    </div>
  );
};

function App() {
  const { isAuthenticated, user, login, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // 페이지 이동 시마다 내 정보(토큰 유효성) 검증 및 정보 갱신
  useEffect(() => {
    const verifyUser = async () => {
      if (isAuthenticated) {
        // 인터셉터가 알아서 토큰 만료 시 리프레시를 수행하므로 내 정보 조회만 호출하면 됨
        const infoRes = await fetchMyInfo();
        if (infoRes.success && infoRes.data) {
          const userInfo = {
            userId: infoRes.data.userId,
            name: infoRes.data.userName,
            email: infoRes.data.userEmail,
            phone: infoRes.data.userPhone,
            branch: infoRes.data.workPlaceName,
            userType: infoRes.data.userTypeName,
            isAdmin: infoRes.data.is_admin
          };
          // 최신 정보로 스토어 업데이트 (토큰은 인터셉터 갱신 로직을 타기 때문에 상태 유지)
          const currentTokens = useAuthStore.getState().user?.tokens;
          login({ ...userInfo, tokens: currentTokens });
        } else {
          // 정보 조회 실패 시(리프레시 토큰 만료 등) 강제 로그아웃
          logout();
          navigate('/login');
        }
      }
    };

    // 로그인/회원가입 페이지가 아닐 때만 조회
    if (location.pathname !== '/login' && location.pathname !== '/signup') {
      verifyUser();
    }
  }, [location.pathname, isAuthenticated]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
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
      <Route path="/records/edit/:id" element={<ProtectedRoute><RecordEdit /></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
      <Route path="/requests/edit/:id" element={<ProtectedRoute><RequestEdit /></ProtectedRoute>} />
      <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
      <Route path="/admin/weekly-assign" element={<AdminRoute><AdminWeeklyAssign /></AdminRoute>} />
      <Route path="/admin/employees" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/records" element={<AdminRoute><AdminRecords /></AdminRoute>} />
      <Route path="/admin/workplaces" element={<AdminRoute><AdminWorkPlaces /></AdminRoute>} />
    </Routes>
  );
}

export default App;
