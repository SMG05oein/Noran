import { create } from 'zustand';

const useServerStateStore = create((set) => ({
  isServerDown: false,
  setServerDown: (status) => set({ isServerDown: status }),
}));

export default useServerStateStore;
