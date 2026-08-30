import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null, // { userId, userName, userPhone, userTypeName, workPlaceName, tokens: { accessToken, refreshToken } }

      login: (userData) => set({ isAuthenticated: true, user: userData }),
      logout: () => {
        sessionStorage.clear();
        set({ isAuthenticated: false, user: null });
      },
      signup: (userData) => set({ isAuthenticated: true, user: userData }),
    }),
    {
      name: 'auth-storage', // localStorage에 저장될 키 이름
    }
  )
);

export default useAuthStore;
