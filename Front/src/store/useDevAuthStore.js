import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useDevAuthStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      devUser: null, // { devId, devName, tokens: { accessToken } }

      devLogin: (userData) => set({ isAuthenticated: true, devUser: userData }),
      devLogout: () => set({ isAuthenticated: false, devUser: null }),
    }),
    {
      name: 'dev-auth-storage', // 완전히 분리된 로컬 스토리지
    }
  )
);

export default useDevAuthStore;
