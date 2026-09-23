import { globalApiClient } from './apiClient';
import { getEmojiByIdx } from '../utils/emojiList';

/**
 * 돼지들 모임 (커뮤니티) API 모듈
 * 백엔드 /api/gathering/* 엔드포인트와 통신하며,
 * 백엔드 미배포 시 브라우저 LocalStorage 기반 Fallback 지원으로 즉시 테스트 가능합니다.
 */

const STORAGE_KEYS = {
  POSTS: 'pig_gathering_posts',
  TAGS: 'pig_gathering_tags',
  COMMENTS: 'pig_gathering_comments'
};

// 초기 시드 태그
const DEFAULT_TAGS = [
  { id: 1, name: '일상썰(기본)', emoji: '☕', emojiIdx: 68, color: 'badge-real' },
  { id: 2, name: '불판/주방(기본)', emoji: '🥩', emojiIdx: 3, color: 'badge-chaos' },
  { id: 3, name: '홀알바(기본)', emoji: '🏃', emojiIdx: 40, color: 'badge-sad' },
  { id: 4, name: '칼퇴기원(기본)', emoji: '🍺', emojiIdx: 15, color: 'badge-escape' },
  { id: 5, name: '질문/건의(기본)', emoji: '💡', emojiIdx: 57, color: 'badge-nonsense' }
];

// 초기 시드 게시글 및 댓글 (더미 데이터 제거 완료)
const DEFAULT_POSTS = [];
const DEFAULT_COMMENTS = [];

// LocalStorage 헬퍼
const getLocalData = (key, defaultVal) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return defaultVal;
    const parsed = JSON.parse(data);
    // 기존 테스트용 더미 데이터(id 1, 2, 3)가 저장되어 있다면 정리
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item.id > 1000);
    }
    return parsed;
  } catch {
    return defaultVal;
  }
};

const setLocalData = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
};

// ==========================================
// 1. 태그 (Tags) API
// ==========================================
export const gatheringApi = {
  // 태그 목록 조회 (백엔드 tagId와 프론트 id 상호 호환 정규화)
  getTags: async () => {
    try {
      const res = await globalApiClient.get('/api/gathering/tags');
      const data = res.data;
      if (Array.isArray(data)) {
        return data.map((t) => {
          const idVal = Number(t.tagId ?? t.id ?? 1);
          return {
            ...t,
            id: idVal,
            tagId: idVal,
            name: t.name,
            emojiIdx: t.emojiIdx ?? 0,
            emoji: t.emoji || getEmojiByIdx(t.emojiIdx ?? 0),
            color: t.color || 'badge-real'
          };
        });
      }
      return data;
    } catch {
      // Fallback
      const tags = getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
      return tags.map((t) => {
        const idVal = Number(t.tagId ?? t.id ?? 1);
        return {
          ...t,
          id: idVal,
          tagId: idVal,
          emoji: t.emoji || getEmojiByIdx(t.emojiIdx ?? 0)
        };
      });
    }
  },

  // 태그 생성
  createTag: async (tagData) => {
    try {
      const res = await globalApiClient.post('/api/gathering/tags', tagData);
      const t = res.data;
      const idVal = Number(t.tagId ?? t.id ?? Date.now());
      return {
        ...t,
        id: idVal,
        tagId: idVal,
        emoji: t.emoji || getEmojiByIdx(t.emojiIdx ?? 0)
      };
    } catch {
      const tags = getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
      const newId = Date.now();
      const newTag = {
        id: newId,
        tagId: newId,
        name: tagData.name,
        emoji: tagData.emoji || getEmojiByIdx(tagData.emojiIdx ?? 0) || '📌',
        emojiIdx: tagData.emojiIdx ?? 0,
        color: tagData.color || 'badge-real'
      };
      const updated = [...tags, newTag];
      setLocalData(STORAGE_KEYS.TAGS, updated);
      return newTag;
    }
  },

  // 태그 수정
  updateTag: async (tagId, tagData) => {
    try {
      const res = await globalApiClient.put(`/api/gathering/tags/${tagId}`, tagData);
      return res.data;
    } catch {
      const tags = getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
      const updated = tags.map((t) => (t.id === Number(tagId) ? { ...t, ...tagData } : t));
      setLocalData(STORAGE_KEYS.TAGS, updated);
      return updated.find((t) => t.id === Number(tagId));
    }
  },

  // 태그 삭제
  deleteTag: async (tagId) => {
    try {
      await globalApiClient.delete(`/api/gathering/tags/${tagId}`);
      return true;
    } catch {
      const tags = getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
      const updated = tags.filter((t) => (t.tagId ?? t.id) !== Number(tagId));
      setLocalData(STORAGE_KEYS.TAGS, updated);
      return true;
    }
  },

  // ==========================================
  // 2. 게시글 (Posts) API
  // ==========================================
  // 게시글 목록 조회
  getPosts: async (params = {}) => {
    try {
      const queryParams = {};
      if (params.tagId && params.tagId !== 'all') {
        queryParams.tagId = Number(params.tagId);
      }
      if (params.myOnly) {
        queryParams.myOnly = true;
        if (params.userIdx) queryParams.userIdx = Number(params.userIdx);
      }
      if (params.keyword && String(params.keyword).trim()) {
        queryParams.keyword = String(params.keyword).trim();
      }

      if (params.includeDeleted) {
        queryParams.includeDeleted = true;
      }

      if (params.unmask) {
        queryParams.unmask = true;
      }

      const res = await globalApiClient.get('/api/gathering/posts', { params: queryParams });
      return res.data;
    } catch {
      let posts = getLocalData(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
      const tags = getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);

      // 논리적 삭제된 글 처리 (includeDeleted가 true면 삭제된 글도 포함)
      if (!params.includeDeleted) {
        posts = posts.filter((p) => !p.isDeleted);
      }

      // 태그 필터
      if (params.tagId && params.tagId !== 'all') {
        posts = posts.filter((p) => Number(p.tagId) === Number(params.tagId));
      }

      // 내 글 필터 (myOnly가 true일 때만 userIdx 필터링)
      if (params.myOnly && params.userIdx) {
        posts = posts.filter((p) => Number(p.userIdx) === Number(params.userIdx));
      }

      // 검색어 필터
      if (params.keyword && String(params.keyword).trim()) {
        const kw = String(params.keyword).trim().toLowerCase();
        posts = posts.filter(
          (p) =>
            p.title?.toLowerCase().includes(kw) ||
            p.content?.toLowerCase().includes(kw) ||
            p.authorName?.toLowerCase().includes(kw)
        );
      }

      // 최신순 정렬
      posts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // 태그 정보 주입 보장
      return posts.map((p) => {
        const tag = tags.find((t) => Number(t.id ?? t.tagId) === Number(p.tagId));
        return {
          ...p,
          tagName: tag?.name || p.tagName || '일상',
          tagEmoji: tag?.emoji || getEmojiByIdx(tag?.emojiIdx ?? p.emojiIdx ?? 0) || p.tagEmoji || '💬',
          tagColor: tag?.color || 'badge-real'
        };
      });
    }
  },

  // 게시글 생성
  createPost: async (postData) => {
    try {
      const res = await globalApiClient.post('/api/gathering/posts', postData);
      return res.data;
    } catch {
      const posts = getLocalData(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
      const tags = getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
      const isAnon = Boolean(postData.isAnonymous);
      const emojiIdx = Number(postData.emojiIdx ?? 0);
      const emojiChar = getEmojiByIdx(emojiIdx);

      const matchedTag = tags.find((t) => t.id === Number(postData.tagId));
      const newPost = {
        id: Date.now(),
        title: postData.title,
        content: postData.content,
        tagId: Number(postData.tagId) || 1,
        tagName: matchedTag?.name || '일상',
        tagEmoji: emojiChar || matchedTag?.emoji || '💬',
        tagColor: matchedTag?.color || 'badge-real',
        emojiIdx: emojiIdx,
        isAnonymous: isAnon,
        authorName: isAnon ? '익명의 돼지 🐷' : (postData.authorName || '노란돼지 알바생'),
        userIdx: postData.userIdx || 1,
        createdAt: new Date().toISOString(),
        commentCount: 0,
        isDeleted: false
      };

      const updated = [newPost, ...posts];
      setLocalData(STORAGE_KEYS.POSTS, updated);
      return newPost;
    }
  },

  // 게시글 수정
  updatePost: async (postId, postData) => {
    try {
      const res = await globalApiClient.put(`/api/gathering/posts/${postId}`, postData);
      return res.data;
    } catch {
      const posts = getLocalData(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
      const tags = getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
      const matchedTag = tags.find((t) => t.id === Number(postData.tagId));

      const updated = posts.map((p) => {
        if (p.id === Number(postId)) {
          return {
            ...p,
            title: postData.title,
            content: postData.content,
            tagId: Number(postData.tagId),
            tagName: matchedTag?.name || p.tagName,
            tagEmoji: matchedTag?.emoji || p.tagEmoji,
            tagColor: matchedTag?.color || p.tagColor,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      setLocalData(STORAGE_KEYS.POSTS, updated);
      return updated.find((p) => p.id === Number(postId));
    }
  },

  // 게시글 논리적 삭제 (Soft Delete)
  deletePost: async (postId) => {
    try {
      await globalApiClient.delete(`/api/gathering/posts/${postId}`);
      return true;
    } catch {
      const posts = getLocalData(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
      const updated = posts.map((p) =>
        p.id === Number(postId) ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p
      );
      setLocalData(STORAGE_KEYS.POSTS, updated);

      // 연관 댓글도 논리적 삭제
      const comments = getLocalData(STORAGE_KEYS.COMMENTS, DEFAULT_COMMENTS);
      const updatedComments = comments.map((c) =>
        c.postId === Number(postId) ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c
      );
      setLocalData(STORAGE_KEYS.COMMENTS, updatedComments);
      return true;
    }
  },

  // 게시글 복구 (Restore)
  restorePost: async (postId) => {
    try {
      const res = await globalApiClient.post(`/api/gathering/posts/${postId}/restore`);
      return res.data;
    } catch {
      const posts = getLocalData(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
      const updated = posts.map((p) =>
        p.id === Number(postId) ? { ...p, isDeleted: false, deletedAt: null } : p
      );
      setLocalData(STORAGE_KEYS.POSTS, updated);
      return true;
    }
  },

  // ==========================================
  // 3. 댓글 (Comments) API
  // ==========================================
  // 댓글 목록 조회 (논리적 삭제된 댓글 제외)
  getComments: async (postId) => {
    try {
      const res = await globalApiClient.get(`/api/gathering/posts/${postId}/comments`);
      return res.data;
    } catch {
      const comments = getLocalData(STORAGE_KEYS.COMMENTS, DEFAULT_COMMENTS);
      return comments.filter((c) => c.postId === Number(postId) && !c.isDeleted);
    }
  },

  // 댓글 등록
  createComment: async (postId, commentData) => {
    try {
      const res = await globalApiClient.post(`/api/gathering/posts/${postId}/comments`, commentData);
      return res.data;
    } catch {
      const comments = getLocalData(STORAGE_KEYS.COMMENTS, DEFAULT_COMMENTS);
      const isAnon = Boolean(commentData.isAnonymous);
      const newComment = {
        id: Date.now(),
        postId: Number(postId),
        content: commentData.content,
        isAnonymous: isAnon,
        authorName: isAnon ? '익명의 돼지 🐷' : (commentData.authorName || '노란돼지 알바생'),
        userIdx: commentData.userIdx || 1,
        createdAt: new Date().toISOString(),
        isDeleted: false
      };
      const updated = [...comments, newComment];
      setLocalData(STORAGE_KEYS.COMMENTS, updated);

      // 게시글 댓글 수 카운트 증가
      const posts = getLocalData(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
      const updatedPosts = posts.map((p) =>
        p.id === Number(postId) ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
      );
      setLocalData(STORAGE_KEYS.POSTS, updatedPosts);

      return newComment;
    }
  },

  // 댓글 논리적 삭제 (Soft Delete)
  deleteComment: async (postId, commentId) => {
    try {
      await globalApiClient.delete(`/api/gathering/comments/${commentId}`);
      return true;
    } catch {
      const comments = getLocalData(STORAGE_KEYS.COMMENTS, DEFAULT_COMMENTS);
      const updated = comments.map((c) =>
        c.id === Number(commentId) ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c
      );
      setLocalData(STORAGE_KEYS.COMMENTS, updated);

      // 게시글 활성 댓글 수 갱신
      const posts = getLocalData(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
      const activeCommentsCount = updated.filter((c) => c.postId === Number(postId) && !c.isDeleted).length;
      const updatedPosts = posts.map((p) =>
        p.id === Number(postId) ? { ...p, commentCount: activeCommentsCount } : p
      );
      setLocalData(STORAGE_KEYS.POSTS, updatedPosts);

      return true;
    }
  },

  // ==========================================
  // 4. 신고 (Report) API
  // ==========================================
  // 게시글 신고
  reportPost: async (postId, reportData) => {
    try {
      const res = await globalApiClient.post(`/api/gathering/posts/${postId}/report`, reportData);
      return res.data;
    } catch {
      const reports = getLocalData('pig_gathering_reports', []);
      const newReport = {
        id: Date.now(),
        targetType: 'POST',
        postId: Number(postId),
        commentId: null,
        targetId: Number(postId),
        reason: reportData.reason,
        details: reportData.details || '',
        userIdx: reportData.userIdx || 1,
        createdAt: new Date().toISOString()
      };
      setLocalData('pig_gathering_reports', [...reports, newReport]);
      return { success: true, message: '신고가 정상 접수되었습니다.' };
    }
  },

  // 댓글 신고
  reportComment: async (commentId, reportData) => {
    try {
      const res = await globalApiClient.post(`/api/gathering/comments/${commentId}/report`, reportData);
      return res.data;
    } catch {
      const reports = getLocalData('pig_gathering_reports', []);
      const newReport = {
        id: Date.now(),
        targetType: 'COMMENT',
        postId: null,
        commentId: Number(commentId),
        targetId: Number(commentId),
        reason: reportData.reason,
        details: reportData.details || '',
        userIdx: reportData.userIdx || 1,
        createdAt: new Date().toISOString()
      };
      setLocalData('pig_gathering_reports', [...reports, newReport]);
      return { success: true, message: '신고가 정상 접수되었습니다.' };
    }
  },

  // 관리자 신고 목록 조회
  getAdminReports: async () => {
    try {
      const res = await globalApiClient.get('/api/gathering/reports');
      return res.data || [];
    } catch {
      return getLocalData('pig_gathering_reports', []);
    }
  },

  // 관리자 신고 처리 (RESOLVED: 조치완료, DISMISSED: 반려)
  resolveReport: async (reportId, action = 'RESOLVED') => {
    try {
      const res = await globalApiClient.put(`/api/gathering/reports/${reportId}`, { status: action });
      return res.data;
    } catch {
      const reports = getLocalData('pig_gathering_reports', []);
      const updated = reports.map((r) =>
        r.id === Number(reportId) ? { ...r, status: action, resolvedAt: new Date().toISOString() } : r
      );
      setLocalData('pig_gathering_reports', updated);
      return { success: true };
    }
  },

  // ==========================================
  // 5. 익명 열람 (Unmask) API — 관리자 전용
  // ==========================================
  // 익명 작성자 실명 열람 + 감사 로그 저장
  // POST /api/gathering/admin/unmask
  // body: { targetType, targetId, targetUserId, reason }
  unmaskPost: async ({ targetType, targetId, targetUserId, reason }) => {
    try {
      const res = await globalApiClient.post('/api/gathering/admin/unmask', {
        targetType,
        targetId,
        targetUserId,
        reason
      });
      return res.data; // { realAuthorName, authorName, ... }
    } catch {
      // Fallback: 백엔드 미연동 시 콘솔에만 기록
      console.warn('[unmask fallback]', { targetType, targetId, targetUserId, reason });
      return { realAuthorName: null };
    }
  }
};

export default gatheringApi;
