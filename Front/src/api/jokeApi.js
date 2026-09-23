import { globalApiClient } from './apiClient';
import { getEmojiByIdx } from '../utils/emojiList';

const STORAGE_KEY = 'noran_custom_jokes';

export const jokeApi = {
  // 농담 목록 조회
  getJokes: async (params = {}) => {
    try {
      const res = await globalApiClient.get('/api/jokes', { params });
      return res.data;
    } catch {
      let customJokes = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) customJokes = JSON.parse(stored);
      } catch {
        customJokes = [];
      }

      // 논리적 삭제된 항목 제외
      let active = customJokes.filter((j) => !j.isDeleted);

      if (params.category && params.category !== 'all') {
        active = active.filter((j) => j.category === params.category);
      }
      if (params.myOnly && params.userIdx) {
        active = active.filter((j) => Number(j.userIdx) === Number(params.userIdx));
      }

      return active;
    }
  },

  // 농담 등록
  createJoke: async (jokeData) => {
    try {
      const res = await globalApiClient.post('/api/jokes', jokeData);
      return res.data;
    } catch {
      let customJokes = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) customJokes = JSON.parse(stored);
      } catch {
        customJokes = [];
      }

      const isAnon = Boolean(jokeData.isAnonymous);
      const emojiIdx = Number(jokeData.emojiIdx ?? 0);
      const emojiChar = getEmojiByIdx(emojiIdx);

      const newJoke = {
        id: Date.now(),
        name: jokeData.name,
        message: jokeData.message,
        category: jokeData.category || 'wtf',
        badge: jokeData.badge || `${emojiChar} 실화냐`,
        badgeType: jokeData.badgeType || 'badge-real',
        emojiIdx: emojiIdx,
        isAnonymous: isAnon,
        authorName: isAnon ? '익명의 돼지 🐷' : (jokeData.authorName || '노란돼지 알바생'),
        userIdx: jokeData.userIdx || 1,
        createdAt: new Date().toISOString(),
        isDeleted: false
      };

      const updated = [newJoke, ...customJokes];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return newJoke;
    }
  },

  // 농담 수정
  updateJoke: async (jokeId, jokeData) => {
    try {
      const res = await globalApiClient.put(`/api/jokes/${jokeId}`, jokeData);
      return res.data;
    } catch {
      let customJokes = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) customJokes = JSON.parse(stored);
      } catch {
        customJokes = [];
      }

      const isAnon = Boolean(jokeData.isAnonymous);
      const emojiIdx = Number(jokeData.emojiIdx ?? 0);
      const emojiChar = getEmojiByIdx(emojiIdx);

      const updated = customJokes.map((j) => {
        if (j.id === Number(jokeId)) {
          return {
            ...j,
            name: jokeData.name,
            message: jokeData.message,
            category: jokeData.category || j.category,
            badge: jokeData.badge || `${emojiChar} 실화냐`,
            badgeType: jokeData.badgeType || j.badgeType,
            emojiIdx: emojiIdx,
            isAnonymous: isAnon,
            authorName: isAnon ? '익명의 돼지 🐷' : (jokeData.authorName || j.authorName),
            updatedAt: new Date().toISOString()
          };
        }
        return j;
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated.find((j) => j.id === Number(jokeId));
    }
  },

  // 농담 논리적 삭제 (Soft Delete)
  deleteJoke: async (jokeId) => {
    try {
      await globalApiClient.delete(`/api/jokes/${jokeId}`);
      return true;
    } catch {
      let customJokes = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) customJokes = JSON.parse(stored);
      } catch {
        customJokes = [];
      }

      const updated = customJokes.map((j) =>
        j.id === Number(jokeId) ? { ...j, isDeleted: true, deletedAt: new Date().toISOString() } : j
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    }
  }
};
