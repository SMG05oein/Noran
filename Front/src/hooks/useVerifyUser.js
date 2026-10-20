import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { fetchMyInfo } from '../api/authApi';

const useVerifyUser = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, login, logout } = useAuthStore();

  useEffect(() => {
    const verifyUser = async () => {
      if (isAuthenticated) {
        // 인터셉터가 알아서 토큰 만료 시 리프레시를 수행하므로 내 정보 조회만 호출하면 됨
        const infoRes = await fetchMyInfo();
        if (infoRes.success && infoRes.data) {
          const userInfo = {
            userIdx: infoRes.data.userIdx,
            userId: infoRes.data.userId,
            name: infoRes.data.userName,
            email: infoRes.data.userEmail,
            phone: infoRes.data.userPhone,
            branch: infoRes.data.workPlaceName,
            workPlaceIdx: infoRes.data.workPlaceIdx,
            userType: infoRes.data.userTypeName,
            userHourlyWage: infoRes.data.userHourlyWage,
            isAdmin: infoRes.data.is_admin,
            fkUtIdx: infoRes.data.fkUtIdx,
            userBirth: infoRes.data.userBirth,
            needsPrivacyConsent: infoRes.data.needsPrivacyConsent,
            needsCollectionConsent: infoRes.data.needsCollectionConsent,
            needsTermsConsent: infoRes.data.needsTermsConsent
          };
          // 최신 정보로 스토어 업데이트 (토큰은 인터셉터 갱신 로직을 타기 때문에 상태 유지)
          const currentTokens = useAuthStore.getState().user?.tokens;
          login({ ...userInfo, tokens: currentTokens });
        } else {
          // 정보 조회 실패 처리
          const status = infoRes.status;
          if (status === 401 || status === 403) {
            // 리프레시 토큰 만료 등 명시적 인증 실패일 때만 강제 로그아웃
            logout();
            navigate('/login');
          } else {
            // 일시적 통신 장애(5xx, 네트워크 오류 등)나 요청 과다(429)일 때는 토큰을 유지하고 강제 로그아웃 차단
            console.warn("일시적 서버 통신 장애 또는 응답 지연으로 인해 내 정보 갱신을 건너뜁니다 (토큰 유지).", status);
          }
        }
      }
      setIsInitializing(false);
    };

    // 로그인/회원가입 페이지가 아닐 때만 조회
    if (location.pathname !== '/login' && location.pathname !== '/signup') {
      verifyUser();
    } else {
      queueMicrotask(() => {
        setIsInitializing(false);
      });
    }
  }, [location.pathname, isAuthenticated, login, logout, navigate]);

  return { isInitializing };
};

export default useVerifyUser;
