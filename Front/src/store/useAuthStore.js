import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const customStorage = {
  getItem: (name) => {
    return localStorage.getItem(name) || sessionStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (localStorage.getItem('isAutoLogin') === 'true') {
      localStorage.setItem(name, value);
    } else {
      sessionStorage.setItem(name, value);
    }
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

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
      name: 'auth-storage', // 스토리지에 저장될 키 이름
      storage: createJSONStorage(() => customStorage),
    }
  )
);

export default useAuthStore;
