import React, { useState, useEffect, useCallback } from 'react';
import { Container, Modal, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  RiArrowLeftLine,
  RiAddLine,
  RiPriceTag3Line,
  RiSearchLine,
  RiChat1Line,
  RiArrowRightSLine,
  RiEdit2Line,
  RiDeleteBinLine,
  RiDiceLine,
  RiFileTextLine,
  RiAlertLine,
  RiAlarmWarningLine,
  RiCloseLine
} from 'react-icons/ri';
import useAuthStore from '../store/useAuthStore';
import { gatheringApi } from '../api/gatheringApi';
import { EMOJI_LIST, getEmojiByIdx } from '../utils/emojiList';
import './PigGathering.css';

const PigGathering = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const currentUserId = user?.userIdx || 1;
  const currentUserName = user?.name || user?.userId || '노란돼지 알바생';
  const isAdmin = user?.isAdmin === 1 || user?.is_admin === 1 || user?.role === 'ADMIN';

  // 비로그인 및 관리자 접근 차단 (알바생 전용 공간 가드)
  useEffect(() => {
    if (!isAuthenticated) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login', { replace: true });
      return;
    }
    if (isAdmin) {
      alert('알바생들의 공간이여서 들어가지 못합니다.');
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  // 상태 관리
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my'
  const [selectedTag, setSelectedTag] = useState('all'); // 'all' | tagId
  const [keyword, setKeyword] = useState('');
  const [tags, setTags] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // 펼쳐진 댓글 섹션 포스트 ID 목록
  const [expandedPostIds, setExpandedPostIds] = useState(new Set());
  const [commentsMap, setCommentsMap] = useState({}); // postId -> comments[]
  const [commentInputs, setCommentInputs] = useState({}); // postId -> text
  const [commentIsAnonymous, setCommentIsAnonymous] = useState({}); // postId -> boolean

  // 게시판 이용규정 모달 상태 및 작성 세션 동의 플래그
  const [hasAgreedInSession, setHasAgreedInSession] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // 게시글 작성 / 수정 모달 상태
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null); // null이면 등록, 객체면 수정
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    tagId: 1,
    emojiIdx: 0,
    isAnonymous: true
  });

  // 태그 관리 모달 상태
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagEmojiIdx, setNewTagEmojiIdx] = useState(0);

  // 신고 모달 상태
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: 'POST', id: null, title: '' });
  const [reportReason, setReportReason] = useState('비방 및 인신공격');
  const [reportDetails, setReportDetails] = useState('');

  // 태그 목록 조회
  const loadTags = useCallback(async () => {
    try {
      const data = await gatheringApi.getTags();
      setTags(data);
      if (data.length > 0) {
        const first = data[0];
        const firstId = Number(first.tagId ?? first.id ?? 1);
        let firstEmojiIdx = 0;
        if (first.emojiIdx !== undefined && first.emojiIdx !== null) {
          firstEmojiIdx = Number(first.emojiIdx);
        } else if (first.emoji) {
          const idx = EMOJI_LIST.indexOf(first.emoji);
          if (idx !== -1) firstEmojiIdx = idx;
        }
        setPostForm((prev) => ({
          ...prev,
          tagId: prev.tagId || firstId,
          emojiIdx: prev.emojiIdx || firstEmojiIdx
        }));
      }
    } catch (e) {
      console.error('태그 조회 실패:', e);
    }
  }, []);

  // 게시글 목록 조회
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const isMyOnly = activeTab === 'my';
      const params = {
        tagId: selectedTag === 'all' ? undefined : Number(selectedTag),
        myOnly: isMyOnly ? true : undefined,
        userIdx: isMyOnly ? currentUserId : undefined,
        keyword: keyword.trim() || undefined
      };
      const data = await gatheringApi.getPosts(params);
      setPosts(data);
    } catch (e) {
      console.error('게시글 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedTag, currentUserId, keyword]);

  useEffect(() => {
    if (!isAdmin) {
      loadTags();
    }
  }, [loadTags, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      loadPosts();
    }
  }, [loadPosts, isAdmin]);

  // 댓글 펼치기 / 접기
  const toggleComments = async (postId) => {
    const nextSet = new Set(expandedPostIds);
    if (nextSet.has(postId)) {
      nextSet.delete(postId);
      setExpandedPostIds(nextSet);
    } else {
      nextSet.add(postId);
      setExpandedPostIds(nextSet);
      try {
        const comments = await gatheringApi.getComments(postId);
        setCommentsMap((prev) => ({ ...prev, [postId]: comments }));
      } catch (e) {
        console.error('댓글 로딩 실패:', e);
      }
    }
  };

  // 댓글 등록
  const handleCommentSubmit = async (postId, e) => {
    e.preventDefault();
    const content = (commentInputs[postId] || '').trim();
    if (!content) return;

    try {
      const isAnon = commentIsAnonymous[postId] !== undefined ? commentIsAnonymous[postId] : true;
      const newComment = await gatheringApi.createComment(postId, {
        content,
        authorName: isAnon ? '익명의 돼지 🐷' : currentUserName,
        userIdx: currentUserId,
        isAnonymous: isAnon
      });

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))
      );
    } catch (err) {
      console.error('댓글 등록 실패:', err);
      alert('댓글 등록에 실패했습니다.');
    }
  };

  // 댓글 삭제 (논리적 삭제)
  const handleCommentDelete = async (postId, commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await gatheringApi.deleteComment(postId, commentId);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== commentId)
      }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) } : p))
      );
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  // 내가 작성한 글이 이미 존재하는지 검사 (별도 컬럼/플래그 없이 작성 이력으로 판별)
  const hasMyWrittenPost = useCallback(() => {
    // 1) 현재 로드된 게시글 목록 중 내 글이 있는지
    if (posts.some((p) => Number(p.userIdx) === Number(currentUserId) && !p.isDeleted)) {
      return true;
    }
    // 2) 로컬스토리지에 내 글이 있는지 (백엔드 미배포 로컬 환경 폴백)
    try {
      const saved = JSON.parse(localStorage.getItem('pig_gathering_posts') || '[]');
      if (Array.isArray(saved) && saved.some((p) => Number(p.userIdx) === Number(currentUserId) && !p.isDeleted)) {
        return true;
      }
    } catch { }
    return false;
  }, [posts, currentUserId]);

  // 게시글 작성 모달 오픈 (내가 쓴 글이 0개일 때만 이용규정 자동 팝업)
  const openCreateModal = () => {
    const hasPost = hasMyWrittenPost();
    if (!hasPost && !hasAgreedInSession) {
      setShowRulesModal(true);
      return;
    }
    const firstTag = tags[0];
    const defaultTagId = Number(firstTag?.tagId ?? firstTag?.id ?? 1);
    let defaultEmojiIdx = 0;
    if (firstTag && firstTag.emojiIdx !== undefined && firstTag.emojiIdx !== null) {
      defaultEmojiIdx = Number(firstTag.emojiIdx);
    } else if (firstTag && firstTag.emoji) {
      const idx = EMOJI_LIST.indexOf(firstTag.emoji);
      if (idx !== -1) defaultEmojiIdx = idx;
    }

    setEditingPost(null);
    setPostForm({
      title: '',
      content: '',
      tagId: defaultTagId,
      emojiIdx: defaultEmojiIdx,
      isAnonymous: true
    });
    setShowPostModal(true);
  };

  // 이용규정 동의 핸들러 (규정 확인 후 글쓰기 창 임시 오픈)
  const handleAgreeRules = () => {
    setShowRulesModal(false);
    setHasAgreedInSession(true); // 이번 세션 임시 허용

    const firstTag = tags[0];
    const defaultTagId = Number(firstTag?.tagId ?? firstTag?.id ?? 1);
    let defaultEmojiIdx = 0;
    if (firstTag && firstTag.emojiIdx !== undefined && firstTag.emojiIdx !== null) {
      defaultEmojiIdx = Number(firstTag.emojiIdx);
    } else if (firstTag && firstTag.emoji) {
      const idx = EMOJI_LIST.indexOf(firstTag.emoji);
      if (idx !== -1) defaultEmojiIdx = idx;
    }

    // 바로 작성 모달 오픈 (글을 실제로 등록해야 내 글이 생겨 영구 인정됨)
    setEditingPost(null);
    setPostForm({
      title: '',
      content: '',
      tagId: defaultTagId,
      emojiIdx: defaultEmojiIdx,
      isAnonymous: true
    });
    setShowPostModal(true);
  };

  // 신고 모달 오픈
  const openReportModal = (type, id, titleOrContent) => {
    setReportTarget({
      type,
      id,
      title: (titleOrContent || '').slice(0, 35)
    });
    setReportReason('비방 및 인신공격');
    setReportDetails('');
    setShowReportModal(true);
  };

  // 신고 제출
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    try {
      if (reportTarget.type === 'POST') {
        await gatheringApi.reportPost(reportTarget.id, {
          reason: reportReason,
          details: reportDetails,
          userIdx: currentUserId
        });
      } else {
        await gatheringApi.reportComment(reportTarget.id, {
          reason: reportReason,
          details: reportDetails,
          userIdx: currentUserId
        });
      }
      setShowReportModal(false);
      alert('신고가 정상 접수되었습니다. 규정 위반 항목은 관리자 확인 후 즉시 조치됩니다.');
    } catch (err) {
      console.error('신고 접수 실패:', err);
      alert('신고 처리 중 오류가 발생했습니다.');
    }
  };

  // 게시글 수정 모달 오픈
  const openEditModal = (post) => {
    setEditingPost(post);
    setPostForm({
      title: post.title,
      content: post.content,
      tagId: Number(post.tagId ?? post.tag?.tagId ?? 1),
      emojiIdx: Number(post.emojiIdx ?? 0),
      isAnonymous: Boolean(post.isAnonymous)
    });
    setShowPostModal(true);
  };

  // 게시글 저장 (생성 또는 수정)
  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!postForm.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!postForm.content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    try {
      if (editingPost) {
        await gatheringApi.updatePost(editingPost.id, postForm);
      } else {
        await gatheringApi.createPost({
          ...postForm,
          authorName: postForm.isAnonymous ? '익명의 돼지 🐷' : currentUserName,
          userIdx: currentUserId
        });
      }
      setShowPostModal(false);
      loadPosts(); // 목록 재조회 시 내 글이 포함되어 이후에는 규정 모달이 안 뜸!
    } catch (err) {
      console.error('게시글 저장 실패:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 게시글 삭제 (논리적 삭제)
  const handleDeletePost = async (postId) => {
    if (!window.confirm('정말 이 이야기를 삭제하시겠습니까?')) return;
    try {
      await gatheringApi.deletePost(postId);
      loadPosts();
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  // 태그 추가 (삭제는 관리자 전용)
  // 태그 추가 (삭제는 관리자 전용)
  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await gatheringApi.createTag({
        name: newTagName.trim(),
        emojiIdx: newTagEmojiIdx,
        emoji: getEmojiByIdx(newTagEmojiIdx),
        color: 'badge-real'
      });
      setNewTagName('');
      loadTags();
    } catch (err) {
      console.error('태그 생성 실패:', err);
      alert('태그 생성에 실패했습니다.');
    }
  };

  // 태그 삭제 (관리자 전용)
  const handleDeleteTag = async (tagId, tagName) => {
    if (!isAdmin) {
      alert('태그 삭제는 관리자만 가능합니다.');
      return;
    }
    if (!window.confirm(`'${tagName}' 태그를 정말 삭제하시겠습니까?`)) return;
    try {
      await gatheringApi.deleteTag(tagId);
      loadTags();
    } catch (err) {
      console.error('태그 삭제 실패:', err);
      alert('태그 삭제에 실패했습니다.');
    }
  };

  // 시간 포맷팅 헬퍼
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return '방금 전';
      if (diffMins < 60) return `${diffMins}분 전`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}시간 전`;
      return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    } catch {
      return '';
    }
  };

  if (!isAuthenticated || isAdmin) {
    return null;
  }

  return (
    <div className="gathering-page-wrapper py-4 px-3">
      <Container className="gathering-container">
        {/* 상단 탑바 */}
        <header className="gathering-topbar">
          <button
            type="button"
            className="gathering-back-btn text-nowrap"
            onClick={() => navigate(-1)}
            aria-label="이전 페이지로 돌아가기"
          >
            <RiArrowLeftLine size={18} />
            <span>돌아가기</span>
          </button>

          <div className="gathering-header-actions">
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-pill d-inline-flex align-items-center gap-1 text-nowrap"
              onClick={() => setShowRulesModal(true)}
            >
              <RiFileTextLine size={15} />
              <span>이용규정</span>
            </Button>

            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-pill d-inline-flex align-items-center gap-1 text-nowrap"
              onClick={() => setShowTagModal(true)}
            >
              <RiPriceTag3Line size={15} />
              <span>태그 관리</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              className="rounded-pill d-inline-flex align-items-center gap-1 px-3 fw-bold text-nowrap"
              onClick={openCreateModal}
            >
              <RiAddLine size={18} />
              <span>이야기 쓰기</span>
            </Button>
          </div>
        </header>

        {/* 상단 '오늘의 농담' 연계 배너 */}
        <div
          className="gathering-joke-banner"
          onClick={() => navigate('/eee')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/eee')}
        >
          <div>
            <div className="joke-banner-title">
              <RiDiceLine size={20} />
              <span>심심할 땐? 오늘의 농담 뽑기 🎲</span>
            </div>
            <p className="joke-banner-desc">
              고기 굽는 개발자와 알바생들의 어이없고 빵 터지는 꿀잼 썰 바로가기
            </p>
          </div>
          <div className="joke-banner-arrow">
            <span>농담 보러가기</span>
            <RiArrowRightSLine size={18} />
          </div>
        </div>

        {/* 페이지 헤더 타이틀 */}
        <div className="mb-4">
          <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.02em' }}>
            돼지들 모임 🐷
          </h2>
          <p className="text-muted small mb-0">
            노란돼지 알바생들의 소소한 일상, 매장 꿀팁, 고충을 자유롭게 나누는 소통 공간입니다.
          </p>
        </div>

        {/* 탭 네비게이션: [전체 이야기] / [내 이야기 모아보기] */}
        <div className="gathering-tabs">
          <button
            type="button"
            className={`gathering-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            전체 이야기 💬
          </button>
          <button
            type="button"
            className={`gathering-tab-btn ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            내가 쓴 이야기 ✍️
          </button>
        </div>

        {/* 태그 필터 칩 바 */}
        <div className="gathering-tags-bar" aria-label="태그 필터">
          <button
            type="button"
            className={`gathering-tag-chip ${selectedTag === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedTag('all')}
          >
            전체
          </button>
          {tags.map((tag) => {
            const tId = String(tag.tagId ?? tag.id);
            return (
              <button
                key={tId}
                type="button"
                className={`gathering-tag-chip ${selectedTag === tId ? 'active' : ''}`}
                onClick={() => setSelectedTag(tId)}
              >
                <span>{tag.emoji || getEmojiByIdx(tag.emojiIdx)}</span>
                <span>{tag.name}</span>
              </button>
            );
          })}
        </div>

        {/* 검색창 */}
        <div className="gathering-search-box">
          <RiSearchLine className="gathering-search-icon" size={17} />
          <input
            type="text"
            className="gathering-search-input"
            placeholder="제목, 내용, 작성자로 이야기 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {/* 게시글 목록 */}
        <main>
          {loading ? (
            <div className="text-center py-5 text-muted">
              이야기를 불러오는 중입니다...
            </div>
          ) : posts.length === 0 ? (
            <div className="gathering-empty">
              <div className="gathering-empty-icon">🐷💬</div>
              <p className="fw-bold mb-1">
                {activeTab === 'my' ? '아직 작성한 이야기가 없습니다.' : '등록된 이야기가 없습니다.'}
              </p>
              <p className="small text-muted mb-3">
                첫 번째 이야기를 남기고 알바생들과 소통해보세요!
              </p>
              <Button
                variant="primary"
                size="sm"
                className="rounded-pill px-3"
                onClick={openCreateModal}
              >
                첫 이야기 작성하기
              </Button>
            </div>
          ) : (
            posts.map((post) => {
              const isOwner = Number(post.userIdx) === Number(currentUserId);
              const isExpanded = expandedPostIds.has(post.id);
              const comments = commentsMap[post.id] || [];
              const postEmoji = post.tagEmoji || getEmojiByIdx(post.emojiIdx);
              const isCommentAnon = commentIsAnonymous[post.id] !== undefined ? commentIsAnonymous[post.id] : true;

              return (
                <article key={post.id} className="post-card">
                  {/* 카드 헤더 */}
                  <div className="post-header">
                    <span className="post-tag">
                      {postEmoji} {post.tagName}
                    </span>

                    <div className="post-meta-info">
                      <span className="post-author">{post.authorName}</span>
                      {isOwner && <span className="post-my-badge">내 글</span>}
                      <span>·</span>
                      <span>{formatTime(post.createdAt)}</span>
                    </div>
                  </div>

                  {/* 제목 & 본문 */}
                  <h3 className="post-title">{post.title}</h3>
                  <div className="post-content">{post.content}</div>

                  {/* 카드 푸터 */}
                  <div className="post-footer">
                    <button
                      type="button"
                      className="post-comment-toggle"
                      onClick={() => toggleComments(post.id)}
                    >
                      <RiChat1Line size={16} />
                      <span>댓글 {post.commentCount || 0}개</span>
                    </button>

                    <div className="d-flex align-items-center gap-1">
                      {isOwner && (
                        <div className="post-owner-actions">
                          <button
                            type="button"
                            className="btn-post-action"
                            onClick={() => openEditModal(post)}
                            title="수정"
                          >
                            <RiEdit2Line size={14} /> 수정
                          </button>
                          <button
                            type="button"
                            className="btn-post-action delete"
                            onClick={() => handleDeletePost(post.id)}
                            title="삭제"
                          >
                            <RiDeleteBinLine size={14} /> 삭제
                          </button>
                        </div>
                      )}
                      {!isOwner && (
                        <button
                          type="button"
                          className="btn-post-action report"
                          onClick={() => openReportModal('POST', post.id, post.title)}
                          title="게시글 신고"
                        >
                          <RiAlertLine size={13} /> 신고
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 댓글 섹션 (인라인 펼침) */}
                  {isExpanded && (
                    <div className="post-comments-section">
                      {comments.length === 0 ? (
                        <div className="comment-empty-box">
                          <span className="comment-empty-icon">💬</span>
                          <span>아직 작성된 댓글이 없습니다. 첫 번째 이야기를 남겨보세요!</span>
                        </div>
                      ) : (
                        comments.map((comment) => {
                          const isCommentOwner = Number(comment.userIdx) === Number(currentUserId);
                          return (
                            <div key={comment.id} className="comment-item">
                              <div className="comment-body">
                                <div className="comment-meta">
                                  <span className="comment-author">{comment.authorName}</span>
                                  {isCommentOwner && <span className="post-my-badge ms-1">나</span>}
                                  <span className="comment-time ms-2">{formatTime(comment.createdAt)}</span>
                                </div>
                                <p className="comment-text">{comment.content}</p>
                              </div>
                              <div className="d-flex align-items-center gap-1">
                                {isCommentOwner && (
                                  <button
                                    type="button"
                                    className="comment-delete-btn"
                                    onClick={() => handleCommentDelete(post.id, comment.id)}
                                    title="댓글 삭제"
                                  >
                                    삭제
                                  </button>
                                )}
                                {!isCommentOwner && (
                                  <button
                                    type="button"
                                    className="comment-report-btn"
                                    onClick={() => openReportModal('COMMENT', comment.id, comment.content)}
                                    title="댓글 신고"
                                  >
                                    <RiAlertLine size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* 댓글 작성 폼 (일체형 모던 인풋 바) */}
                      <form
                        onSubmit={(e) => handleCommentSubmit(post.id, e)}
                        className="comment-input-form"
                      >
                        <div className="comment-input-box">
                          {/* 익명 토글 버튼 (인풋 내부 좌측 배치) */}
                          <button
                            type="button"
                            className={`btn-comment-anon-pill ${isCommentAnon ? 'active' : ''}`}
                            onClick={() =>
                              setCommentIsAnonymous((prev) => ({
                                ...prev,
                                [post.id]: !(prev[post.id] !== undefined ? prev[post.id] : true)
                              }))
                            }
                            title="익명 모드 토글"
                          >
                            <span>{isCommentAnon ? '🐷 익명' : '👤 실명'}</span>
                          </button>

                          <input
                            type="text"
                            className="comment-input"
                            placeholder={isCommentAnon ? "익명으로 따뜻한 한마디 남기기..." : "동료 알바생에게 댓글을 남겨보세요..."}
                            value={commentInputs[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                          />

                          <button
                            type="submit"
                            className={`comment-submit-btn ${(commentInputs[post.id] || '').trim() ? 'active' : ''}`}
                            disabled={!(commentInputs[post.id] || '').trim()}
                          >
                            등록
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </main>
      </Container>

      {/* =========================================================
          게시글 작성 / 수정 모달
         ========================================================= */}
      <Modal
        show={showPostModal}
        onHide={() => setShowPostModal(false)}
        centered
        scrollable
        backdrop="static"
        className="gathering-custom-modal"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2">
            <span>✍️</span>
            <span>{editingPost ? '이야기 수정하기' : '새로운 이야기 작성'}</span>
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSavePost}>
          <Modal.Body className="gathering-modal-body pt-3">
            {/* 태그 선택 바 (태그 대표 이모지 자동 연동) */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted mb-1">태그(카테고리) 선택</Form.Label>
              <Form.Select
                className="gathering-select-control"
                value={Number(postForm.tagId || (tags[0]?.tagId ?? tags[0]?.id ?? 1))}
                onChange={(e) => {
                  const selectedVal = Number(e.target.value);
                  const matched = tags.find((t) => Number(t.tagId ?? t.id) === selectedVal);
                  setPostForm((prev) => {
                    let nextEmojiIdx = prev.emojiIdx;
                    if (matched && matched.emojiIdx !== undefined && matched.emojiIdx !== null) {
                      nextEmojiIdx = Number(matched.emojiIdx);
                    } else if (matched && matched.emoji) {
                      const foundIdx = EMOJI_LIST.indexOf(matched.emoji);
                      if (foundIdx !== -1) nextEmojiIdx = foundIdx;
                    }
                    return {
                      ...prev,
                      tagId: selectedVal,
                      emojiIdx: nextEmojiIdx
                    };
                  });
                }}
              >
                {tags.length > 0 ? (
                  tags.map((t) => {
                    const tVal = Number(t.tagId ?? t.id ?? 1);
                    const tEmoji = t.emoji || getEmojiByIdx(t.emojiIdx);
                    return (
                      <option key={tVal} value={tVal}>
                        {tEmoji} {t.name}
                      </option>
                    );
                  })
                ) : (
                  <option value={1}>☕ 일상썰(기본)</option>
                )}
              </Form.Select>
            </Form.Group>

            {/* 제목 입력 */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted mb-1">제목</Form.Label>
              <Form.Control
                type="text"
                className="gathering-form-control"
                placeholder="제목을 입력해주세요"
                value={postForm.title}
                onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                maxLength={80}
                required
              />
            </Form.Group>

            {/* 내용 입력 */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted mb-1">내용</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                className="gathering-form-control gathering-textarea"
                placeholder="노란돼지 알바생들과 나누고 싶은 이야기를 적어주세요!"
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                required
              />
            </Form.Group>

            {/* 익명 체크 & 규정 링크 정돈된 바 (절대 줄바꿈 방지) */}
            <div className="post-modal-anon-bar">
              <label htmlFor="post-anon-check" className="post-anon-label">
                <input
                  type="checkbox"
                  id="post-anon-check"
                  checked={Boolean(postForm.isAnonymous)}
                  onChange={(e) => setPostForm({ ...postForm, isAnonymous: e.target.checked })}
                  className="post-anon-checkbox"
                />
                <span className="user-select-none">익명으로 작성하기 (익명의 돼지 🐷)</span>
              </label>

              <button
                type="button"
                className="btn-modal-rules-link"
                onClick={() => setShowRulesModal(true)}
              >
                이용규정 확인
              </button>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-pill px-4"
              onClick={() => setShowPostModal(false)}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              className="rounded-pill px-4 fw-bold"
            >
              {editingPost ? '수정 완료' : '등록하기'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* =========================================================
          태그 관리 모달
         ========================================================= */}
      <Modal
        show={showTagModal}
        onHide={() => setShowTagModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5">
            🏷️ 게시판 태그 관리
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="gathering-modal-body pt-3">
          <p className="text-muted small mb-3">
            이야기에 붙일 새로운 태그를 추가할 수 있습니다.
            {isAdmin ? (
              <span className="text-danger fw-bold ms-1">
                (관리자 권한: 태그 우측 ✕ 클릭 시 삭제 가능)
              </span>
            ) : (
              <span className="ms-1">(태그 삭제는 관리자 전용입니다)</span>
            )}
          </p>

          {/* 태그 추가 인풋 */}
          <Form onSubmit={handleCreateTag} className="d-flex gap-2 mb-4">
            <Form.Select
              style={{ width: '80px' }}
              value={newTagEmojiIdx}
              onChange={(e) => setNewTagEmojiIdx(Number(e.target.value))}
            >
              {EMOJI_LIST.slice(0, 30).map((emoji, idx) => (
                <option key={idx} value={idx}>
                  {emoji}
                </option>
              ))}
            </Form.Select>
            <Form.Control
              type="text"
              className="flex-grow-1"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="새 태그 이름 입력..."
              maxLength={20}
              required
            />
            <Button
              variant="primary"
              type="submit"
              size="sm"
              className="rounded-pill px-3 fw-bold text-nowrap"
            >
              추가
            </Button>
          </Form>

          {/* 등록된 태그 목록 */}
          <div className="small fw-bold text-muted mb-2">현재 태그 목록 ({tags.length})</div>
          <div className="d-flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="d-inline-flex align-items-center gap-1 border px-2 py-1 rounded-pill bg-light"
                style={{ fontSize: '0.85rem' }}
              >
                <span>{tag.emoji || getEmojiByIdx(tag.emojiIdx)}</span>
                <span className="fw-semibold">{tag.name}</span>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn-tag-delete ms-1"
                    onClick={() => handleDeleteTag(tag.id, tag.name)}
                    title="태그 삭제 (관리자 전용)"
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '0 2px',
                      color: 'var(--color-danger, #ef4444)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '0.9rem'
                    }}
                  >
                    <RiCloseLine size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-pill px-3"
            onClick={() => setShowTagModal(false)}
          >
            닫기
          </Button>
        </Modal.Footer>
      </Modal>

      {/* =========================================================
          신고 접수 모달
         ========================================================= */}
      <Modal
        show={showReportModal}
        onHide={() => setShowReportModal(false)}
        centered
        scrollable
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2 text-danger">
            <RiAlarmWarningLine size={22} />
            <span>{reportTarget.type === 'POST' ? '게시글 신고' : '댓글 신고'}</span>
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleReportSubmit}>
          <Modal.Body className="gathering-modal-body pt-3">
            <div className="p-2 mb-3 bg-light rounded text-muted small">
              <strong>신고 대상:</strong> {reportTarget.title || '(내용 없음)'}
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">신고 사유 선택</Form.Label>
              <Form.Select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="비방 및 인신공격">비방 및 인신공격</option>
                <option value="개인정보 무단 노출">개인정보 무단 노출</option>
                <option value="욕설 및 혐오 표현">욕설 및 혐오 표현</option>
                <option value="허위사실 유포 및 영업방해">허위사실 유포 및 영업방해</option>
                <option value="음란물 및 부적절한 홍보">음란물 및 부적절한 홍보</option>
                <option value="기타 사유">기타 사유</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">상세 내용 (선택)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="구체적인 위반 내용을 기재해주시면 처리에 큰 도움이 됩니다."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </Form.Group>

            <p className="text-muted small mb-0" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
              ※ 신고자의 신원은 피신고자 및 일반 이용자에게 공개되지 않으며, 신고 내용은 비공개로 처리됩니다. 자세한 내용은 이용규정 제7조를 확인해 주세요. 악의적인 허위 신고에는 이용 제한 등의 불이익이 있을 수 있습니다.
            </p>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-pill px-3"
              onClick={() => setShowReportModal(false)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="submit"
              className="rounded-pill px-4 fw-bold"
            >
              신고 접수
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* =========================================================
          돼지들 모임 게시판 이용규정 모달 (5가지 핵심 조항 명시)
         ========================================================= */}
      <Modal
        show={showRulesModal}
        onHide={() => setShowRulesModal(false)}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2">
            <RiFileTextLine size={20} className="text-primary" />
            <span>노란돼지 알바생 게시판 이용규정</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="gathering-modal-body pt-3">
          <div className="rules-container">
            {/* 핵심 요약 박스 */}
            <div className="rules-alert-box">
              <div className="rules-alert-title">
                <RiAlertLine size={18} />
                <span>중요 안내: 알바생 권리 보호 및 운영 핵심 요약</span>
              </div>
              <p className="mb-2 small" style={{ lineHeight: '1.65' }}>
                본 '돼지들 모임'은 알바생들의 자유로운 소통을 위해 <strong>원칙적으로 점장·대표 등 매장 관리자에게 비공개</strong>되는 전용 공간입니다. 알바생과 사업주 간의 권력 차이로 인한 불이익을 방지하고 상호 신뢰를 높이기 위해 아래 핵심 운영 원칙을 준수합니다.
              </p>
              <div className="rules-badge-notice mb-2">
                ※ 본 규정은 <strong>회원가입 시 동의하신 일반 약관과 별개로 적용되는 사내 게시판 전용 특별 이용규정</strong>입니다. 글 작성 시 내용을 확인하고 동의한 후 이용하실 수 있습니다.
              </div>
              <div className="p-2 bg-white rounded border small text-dark mt-2">
                <div className="fw-bold text-primary mb-1">📋 핵심 권리 보호 4대 원칙</div>
                <div>1. <strong>목적 한정 열람:</strong> 시스템 관리자의 작성자 식별 정보 열람은 신고 조사, 법적 요청 등 명시된 사유에 한하며 감사 로그가 기록됩니다.</div>
                <div>2. <strong>소명 절차 보장:</strong> 매장 관리자(점장·대표) 통보는 중대 사규 위반 시 사실 확인 및 작성자 소명 절차를 거친 후 진행됩니다.</div>
                <div>3. <strong>신고자 신원 비공개:</strong> 신고자의 신원은 피신고자 및 일반 이용자에게 공개되지 않으며, 조치 결과가 안내되는 경우에도 동일합니다.</div>
                <div>4. <strong>보관 기한 명시:</strong> 삭제된 게시물·댓글은 분쟁 해결을 위해 6개월간 분리 보관 후 영구 파기됩니다.</div>
              </div>
            </div>

            <h6 className="rules-section-title">제1조 (목적 및 성격)</h6>
            <p className="small text-muted mb-3">
              본 공간은 노란돼지 알바생들의 <strong>자유롭고 솔직한 소통과 지점별 유대관계 향상</strong>, 매장 일상의 이야기, 꿀팁, 고충을 나누며 서로 격려하기 위해 마련된 사내 소통 게시판입니다. 본 규정은 <strong>회원가입 시 동의한 일반 서비스 약관과 구별되는 사내 커뮤니티 전용 규정</strong>입니다.
            </p>

            <h6 className="rules-section-title">제2조 (용어의 정의)</h6>
            <ul className="rules-list small text-muted">
              <li><strong>1. '돼지들 모임(게시판)'</strong>: 노란돼지 매장 알바생 간의 자유로운 소통과 정보 공유를 위해 운영되는 사내 비공개 커뮤니티 공간을 말합니다.</li>
              <li><strong>2. '알바생(이용자)'</strong>: 노란돼지 각 지점에서 근무 중인 파트타임 및 아르바이트 직원을 말합니다.</li>
              <li><strong>3. '매장 관리자(점장·대표)'</strong>: 각 지점의 점장, 매니저, 대표 등 인사 및 매장 운영 관리 권한을 가진 직원을 말하며, 원칙적으로 본 게시판 접근이 차단됩니다.</li>
              <li><strong>4. '시스템 관리자(개발자)'</strong>: 본 서비스의 시스템 유지보수, 서버 및 데이터베이스 관리, 보안 및 커뮤니티 운영을 총괄하는 기술 운영 인력을 말합니다.</li>
              <li><strong>5. '준익명제'</strong>: 화면상 닉네임을 '익명의 돼지 🐷'로 마스킹 표기하되, 악의적 사규 위반 및 허위 신고 방지를 위해 내부 데이터베이스에는 계정 고유 식별자가 안전하게 기록되는 운영 방식을 말합니다.</li>
              <li><strong>6. '논리적 삭제(Soft Delete)'</strong>: 규정 위반 또는 삭제 요청 시 화면 노출을 즉시 차단하되, 분쟁 해결, 피해자 구제, 사규 위반 입증을 위해 <strong>삭제일로부터 6개월간 분리 보관 후 영구 파기</strong>하는 조치를 말합니다.</li>
            </ul>

            <h6 className="rules-section-title">제3조 (준익명제의 한계 및 시스템 관리자 열람 권한의 제한)</h6>
            <ul className="rules-list small text-muted">
              <li>게시판의 익명 작성 기능은 <strong>완벽한 익명이 아닌 '준익명제'</strong>에 기반합니다. 화면에는 닉네임이 '익명의 돼지 🐷'로 마스킹되어 일반 이용자 간에는 식별되지 않습니다.</li>
              <li><strong>열람 사유의 제한:</strong> 시스템 관리자는 개인정보 최소 처리 원칙에 따라 다음 각 호의 사유가 발생한 경우에 한하여 필요한 최소한의 범위에서만 작성자 식별 정보를 열람할 수 있습니다.
                <div className="ps-3 mt-1 text-dark">
                  - 제7조에 따른 정식 신고가 접수되어 규정 위반 사실관계 조사가 불가피한 경우<br/>
                  - 수사기관 등이 적법한 절차(영장 등)에 따라 요청하는 경우<br/>
                  - 시스템 해킹, 데이터 위·변조 등 침해사고 대응 및 기술적 보안 조치가 필요한 경우
                </div>
              </li>
              <li><strong>열람 감사 로그 기록:</strong> 시스템 관리자가 식별 정보를 열람하는 경우 열람 일시, 열람자, 구체적 사유가 감사 로그에 자동 기록되어 임의 열람과 권한 남용을 방지합니다.</li>
            </ul>

            <h6 className="rules-section-title">제4조 (개인정보 보호 및 인신공격·비방 금지)</h6>
            <ul className="rules-list small text-muted">
              <li>동료 알바생, 특정 직원, 방문 손님을 향한 인신공격, 욕설, 비방, 조롱, 허위사실 유포는 금지됩니다.</li>
              <li>타인의 실명, 연락처, 사생활, 근무 일정 등 민감한 개인정보를 무단으로 노출하거나 유포해서는 안 됩니다.</li>
              <li>건전한 근무 환경 조성을 위해 배려와 상호 존중의 태도로 소통해 주시기 바랍니다.</li>
            </ul>

            <h6 className="rules-section-title">제5조 (태그 관리)</h6>
            <ul className="rules-list small text-muted">
              <li>모든 알바생은 새 태그를 추가하여 주제별로 이야기를 분류할 수 있습니다.</li>
              <li>중복 태그나 부적절한 태그는 <strong>시스템 관리자</strong>에 의해 정리·삭제될 수 있습니다. (태그 삭제는 시스템 관리자 전용 권한입니다)</li>
            </ul>

            <h6 className="rules-section-title">제6조 (중대 사규 위반 시 조치 및 매장 관리자 통보 절차)</h6>
            <ul className="rules-list small text-muted mb-3">
              <li><strong>1. 임시 보호 조치:</strong> 규정 위반 소지가 명백한 게시물 및 댓글은 2차 피해 방지를 위해 우선 <strong>논리적 삭제(6개월 보관 후 파기)</strong> 처리될 수 있습니다. 이는 임시 조치이며, 이후 제3항의 절차가 이어집니다.</li>
              <li><strong>2. 통보 대상:</strong> 다음 각 호의 <strong>중대한 사규 위반 행위</strong>에 한하여 매장 관리자 통보 절차가 검토됩니다.
                <div className="ps-3 mt-1 text-dark">
                  - 특정 직원에 대한 지속적인 직장 내 괴롭힘, 집단 따돌림, 성희롱<br/>
                  - 허위사실 유포를 통한 동료 또는 매장의 심각한 명예훼손<br/>
                  - 매장 영업 비밀 유출 또는 고의적인 영업 방해 행위
                </div>
              </li>
              <li><strong>3. 사실 확인 및 소명 기회 보장:</strong> 시스템 관리자는 일방적으로 통보하지 않으며, 1차 사실관계 확인 후 해당 작성자에게 충분한 소명 기회를 부여합니다. 정당한 소명이 없거나 불법·중대 사규 위반이 명백한 경우에 한하여 통보 절차가 진행됩니다.</li>
              <li><strong>4. 개인정보 제3자 제공 고지:</strong>
                <div className="ps-3 mt-1 text-dark">
                  - 제공받는 자: 해당 소속 지점의 <strong>매장 관리자(점장 및 대표)</strong><br/>
                  - 제공 목적: 사규 위반 조사, 피해자 보호 조치 및 직장 내 괴롭힘 근절<br/>
                  - 제공 항목: 작성자 성명, 소속 지점, 해당 위반 게시물/댓글 원문 및 작성 일시<br/>
                  - 보유 기간: 조사 및 조치 완료 시점까지(최장 1년) 보관 후 영구 파기 (제2조 6호의 삭제 게시물 보관 기간과는 별도)
                </div>
              </li>
              <li><strong>5. 징계 근거의 분리:</strong> 위반자에 대한 징계 등 인사 조치는 본 이용규정이 아닌 <strong>회사의 취업규칙 및 근로계약서에 명시된 절차</strong>에 따라 판단됩니다.</li>
            </ul>

            <h6 className="rules-section-title">제7조 (신고 접수 및 처리 절차)</h6>
            <ul className="rules-list small text-muted mb-3">
              <li><strong>1. 신고자 신원 비공개:</strong> 신고자의 신원(성명, 계정 정보)은 <strong>피신고자 및 일반 이용자에게 공개되지 않습니다.</strong> 다만 허위 신고 방지와 사실 확인을 위해 시스템 관리자 데이터베이스에는 내부 식별자가 기록되며, 열람은 제3조의 사유와 절차에 따릅니다.</li>
              <li><strong>2. 비공개 처리 원칙:</strong> 접수된 신고 내역, 사유 및 조사 과정은 비공개 처리가 원칙입니다.</li>
              <li><strong>3. 조치 결과 안내:</strong> 다수 이용자에게 영향을 미치는 중대한 위반의 경우, 2차 피해 방지를 위해 <strong>'위반 사유 및 삭제 조치 결과'에 한하여</strong> 공개 안내할 수 있습니다. 이 경우에도 신고자의 신원은 공개되지 않습니다.</li>
              <li><strong>4. 처리 기간 및 결과 안내:</strong> 신고는 접수일로부터 [ 3 ]일 이내에 처리하며, 처리 결과는 [ 안내 방식 ]으로 신고자에게 안내합니다.</li>
            </ul>

            <h6 className="rules-section-title">제8조 (서비스의 변경 및 중단)</h6>
            <ul className="rules-list small text-muted mb-3">
              <li><strong>1.</strong> 본 게시판은 근태관리 서비스의 부가 기능으로 제공됩니다.</li>
              <li><strong>2.</strong> 운영상 필요에 따라 기능 개선이 지연되거나 서비스가 변경·중단될 수 있으며, 중단 시에는 사전에 공지합니다.</li>
              <li><strong>3.</strong> 서비스 중단 시 보관 중인 게시물과 관련 정보는 제2조 6호 및 관련 조항의 보관 기한에 따라 처리됩니다.</li>
            </ul>

            <h6 className="rules-section-title">제9조 (게시물의 책임 및 규정의 변경)</h6>
            <ul className="rules-list small text-muted mb-0">
              <li><strong>1. 게시물의 책임:</strong> 게시물과 댓글의 내용에 대한 책임은 작성자 본인에게 있습니다.</li>
              <li><strong>2. 이의제기:</strong> 삭제 등 조치에 이의가 있는 작성자는 [ 질문 건의 게시판 ]으로 이의를 제기할 수 있습니다.</li>
              <li><strong>3. 허위 신고:</strong> 악의적인 허위 신고에는 [ 구체적 조치: 예) 게시판 이용 제한 ]이 적용될 수 있습니다.</li>
              <li><strong>4. 규정의 변경:</strong> 본 규정을 변경하는 경우 시행 [ 3 ]일 전에 게시판 내 공지를 통해 안내합니다.</li>
            </ul>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="primary"
            size="sm"
            className="rounded-pill px-4 fw-bold"
            onClick={handleAgreeRules}
          >
            [필수] 노란돼지 알바생 게시판 이용규정 확인 및 동의
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PigGathering;
