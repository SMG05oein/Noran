import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Button, Spinner, Modal, Form, Badge, InputGroup, Row, Col } from 'react-bootstrap';
import {
  RiAlertLine,
  RiChat1Line,
  RiPriceTag3Line,
  RiDeleteBinLine,
  RiCheckLine,
  RiCloseLine,
  RiSearchLine,
  RiAddLine,
  RiEyeLine,
  RiArrowRightLine,
  RiRefreshLine,
  RiEdit2Line,
  RiRestartLine
} from 'react-icons/ri';
import { gatheringApi } from '../api/gatheringApi';
import useAuthStore from '../store/useAuthStore';
import { EMOJI_LIST, getEmojiByIdx } from '../utils/emojiList';
import './AdminMain.css';
import './AdminBoard.css';
import Loading from '../components/Loading';

const UNMASK_POLICY =
  '이 행위는 "신고 조사 / 규정 위반 조치" 사유로만 허용됩니다.';

const AdminBoard = () => {
  // 활성 탭: 'posts' | 'tags' | 'reports' (기본: 게시글 & 댓글 관리)
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);

  // 1. 신고 데이터 상태
  const [reports, setReports] = useState([]);
  const [reportFilter, setReportFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'
  const [selectedReport, setSelectedReport] = useState(null); // 세부 확인 모달용

  // 2. 게시글 및 댓글 상태
  const { user } = useAuthStore();
  const adminName = user?.name || user?.username || user?.userId || '관리자';

  const [posts, setPosts] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [postTagFilter, setPostTagFilter] = useState('ALL');
  const [includeDeleted, setIncludeDeleted] = useState(false); // 삭제된 글 포함 토글
  const [showRealAuthor, setShowRealAuthor] = useState(false); // 익명 전체 열람 토글
  const [unmaskedRows, setUnmaskedRows] = useState({}); // { postId: realAuthorName } 행별 열람 상태
  const [unmaskedComments, setUnmaskedComments] = useState({}); // { commentId: realAuthorName }
  const [unmaskModal, setUnmaskModal] = useState(null); // { type: 'row'|'all', post? }
  const [unmaskReason, setUnmaskReason] = useState('');
  const [unmaskSubmitting, setUnmaskSubmitting] = useState(false);
  const [unmaskReasons, setUnmaskReasons] = useState({}); // { postId: reason }
  const [globalUnmaskReason, setGlobalUnmaskReason] = useState('');
  const [viewCommentsPost, setViewCommentsPost] = useState(null); // 댓글 확인 모달용
  const [postComments, setPostComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // 3. 태그 상태
  const [tags, setTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null); // null: 추가, 객체: 수정
  const [newTagName, setNewTagName] = useState('');
  const [newTagEmojiIdx, setNewTagEmojiIdx] = useState(0);

  // 공통 데이터 로딩
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsData, postsData, tagsData] = await Promise.all([
        gatheringApi.getAdminReports(),
        gatheringApi.getPosts({ page: 0, size: 100, includeDeleted, unmask: showRealAuthor }),
        gatheringApi.getTags()
      ]);
      setReports(reportsData || []);
      setPosts(postsData || []);
      setTags(tagsData || []);
    } catch (err) {
      console.error('관리자 게시판 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [includeDeleted, showRealAuthor]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ==========================================
  // [탭 1: 신고 관리 핸들러]
  // ==========================================
  const handleResolveReport = async (reportId, action) => {
    if (!window.confirm(action === 'RESOLVED' ? '이 신고를 처리 완료하시겠습니까?' : '이 신고를 반려하시겠습니까?')) return;
    try {
      await gatheringApi.resolveReport(reportId, action);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: action, resolvedAt: new Date().toISOString() } : r))
      );
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport((prev) => ({ ...prev, status: action }));
      }
      alert('신고 상태가 업데이트되었습니다.');
    } catch (err) {
      console.error('신고 상태 업데이트 실패:', err);
      alert('신고 처리 중 오류가 발생했습니다.');
    }
  };

  // 신고된 원문 삭제 및 조치 완료
  const handleDeleteReportedTarget = async (report) => {
    const isPost = report.targetType === 'POST';
    const targetName = isPost ? '원문 게시글' : '원문 댓글';

    if (!window.confirm(`정말 해당 ${targetName}을(를) 삭제하고 신고를 [조치 완료] 처리하시겠습니까?`)) return;

    try {
      if (isPost) {
        const postId = report.postId || report.targetId;
        await gatheringApi.deletePost(postId);
        setPosts((prev) => prev.filter((p) => p.id !== Number(postId)));
      } else {
        const commentId = report.commentId || report.targetId;
        const postId = report.postId;
        await gatheringApi.deleteComment(postId, commentId);
      }

      await gatheringApi.resolveReport(report.id, 'RESOLVED');
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status: 'RESOLVED', resolvedAt: new Date().toISOString() } : r))
      );
      setSelectedReport(null);
      alert(`${targetName}이(가) 성공적으로 삭제되었으며 신고 처리가 완료되었습니다.`);
    } catch (err) {
      console.error('원문 삭제 및 신고 처리 실패:', err);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  // 필터링된 신고 목록
  const filteredReports = reports.filter((r) => {
    const status = r.status || 'PENDING';
    if (reportFilter === 'ALL') return true;
    return status === reportFilter;
  });

  const pendingReportsCount = reports.filter((r) => (r.status || 'PENDING') === 'PENDING').length;

  // ==========================================
  // [탭 2: 게시글 & 댓글 관리 핸들러]
  // ==========================================
  const handleDeletePost = async (postId) => {
    if (!window.confirm(`게시글(ID: ${postId})을 삭제하시겠습니까? (논리적 삭제 처리됩니다)`)) return;
    try {
      await gatheringApi.deletePost(postId);
      if (includeDeleted) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p))
        );
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
      alert('게시글이 삭제되었습니다.');
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 삭제된 게시글 복구
  const handleRestorePost = async (postId) => {
    if (!window.confirm(`게시글(ID: ${postId})을 복구하시겠습니까?`)) return;
    try {
      await gatheringApi.restorePost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isDeleted: false, deletedAt: null } : p))
      );
      alert('게시글이 성공적으로 복구되었습니다.');
    } catch (err) {
      console.error('게시글 복구 실패:', err);
      alert('게시글 복구 중 오류가 발생했습니다.');
    }
  };

  // 익명 댓글 실명 열람 (게시글 열람에 연동)
  const unmaskAnonymousComments = async (postId, comments, reasonPrefix) => {
    const anon = (comments || []).filter((c) => c.isAnonymous && unmaskedComments[c.id] === undefined);
    if (anon.length === 0) return;

    const next = {};
    await Promise.all(
      anon.map(async (c) => {
        const reason = `${reasonPrefix} · 댓글 #${c.id} 실명 열람`;
        try {
          const result = await gatheringApi.unmaskReveal({
            targetType: 'COMMENT',
            targetId: c.id,
            reason,
          });
          next[c.id] = result?.realName || result?.realAuthorName || c.authorName || '(열람 실패)';
        } catch {
          next[c.id] = c.authorName || '(열람 오류)';
        }
      })
    );
    setUnmaskedComments((prev) => ({ ...prev, ...next }));
  };

  const closeUnmaskModal = () => {
    if (unmaskSubmitting) return;
    setUnmaskModal(null);
    setUnmaskReason('');
  };

  // 행별 익명 실명 열람 — 사유 입력 모달 오픈
  const handleUnmaskRow = (post) => {
    if (unmaskedRows[post.id] !== undefined) return;
    setUnmaskReason('');
    setUnmaskModal({ type: 'row', post });
  };

  // 전체 열람 토글 — 켤 때만 사유 입력 모달
  const handleToggleShowRealAuthor = (checked) => {
    if (checked) {
      setUnmaskReason('');
      setUnmaskModal({ type: 'all' });
      return;
    }
    setShowRealAuthor(false);
    setUnmaskedRows({});
    setUnmaskedComments({});
    setUnmaskReasons({});
    setGlobalUnmaskReason('');
  };

  const submitUnmask = async () => {
    const reason = unmaskReason.trim();
    if (!reason) {
      alert('열람 사유를 입력해 주세요.');
      return;
    }
    if (!unmaskModal) return;

    setUnmaskSubmitting(true);
    try {
      if (unmaskModal.type === 'row') {
        const post = unmaskModal.post;
        try {
          const result = await gatheringApi.unmaskPost({
            targetType: 'POST',
            targetId: post.id,
            targetUserId: post.userIdx || post.userId || 0,
            reason,
          });
          const realName = result?.realAuthorName || result?.authorName || post.authorName || '(열람 실패)';
          setUnmaskedRows((prev) => ({ ...prev, [post.id]: realName }));
          setUnmaskReasons((prev) => ({ ...prev, [post.id]: reason }));

          try {
            const comments = await gatheringApi.getComments(post.id);
            await unmaskAnonymousComments(post.id, comments || [], reason);
            if (viewCommentsPost?.id === post.id) {
              setPostComments(comments || []);
            }
          } catch (err) {
            console.error('댓글 실명 열람 연동 실패:', err);
          }
        } catch {
          setUnmaskedRows((prev) => ({ ...prev, [post.id]: post.authorName || '(열람 오류)' }));
        }
      } else {
        try {
          await gatheringApi.unmaskPost({
            targetType: 'all',
            targetId: 9,
            targetUserId: 0,
            reason,
          });
        } catch {
          // 로그 실패해도 UI 전환
        }
        setShowRealAuthor(true);
        setGlobalUnmaskReason(reason);
        if (viewCommentsPost && postComments.length > 0) {
          await unmaskAnonymousComments(viewCommentsPost.id, postComments, reason);
        }
      }
      setUnmaskModal(null);
      setUnmaskReason('');
    } finally {
      setUnmaskSubmitting(false);
    }
  };

  const handleOpenCommentsModal = async (post) => {
    setViewCommentsPost(post);
    setLoadingComments(true);
    try {
      const data = await gatheringApi.getComments(post.id);
      setPostComments(data || []);
      const postUnmasked = unmaskedRows[post.id] !== undefined || showRealAuthor;
      if (postUnmasked) {
        const reasonPrefix =
          unmaskReasons[post.id] ||
          globalUnmaskReason ||
          `관리자 ${adminName} 게시글 #${post.id} 실명 열람`;
        await unmaskAnonymousComments(post.id, data || [], reasonPrefix);
      }
    } catch (err) {
      console.error('댓글 목록 조회 실패:', err);
      setPostComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!viewCommentsPost) return;
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return;
    try {
      await gatheringApi.deleteComment(viewCommentsPost.id, commentId);
      setPostComments((prev) => prev.filter((c) => c.id !== commentId));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === viewCommentsPost.id ? { ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) } : p
        )
      );
      alert('댓글이 삭제되었습니다.');
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesTag = postTagFilter === 'ALL' || String(p.tagId) === String(postTagFilter);
    const keyword = searchKeyword.toLowerCase();
    const matchesKeyword =
      !keyword ||
      (p.title || '').toLowerCase().includes(keyword) ||
      (p.content || '').toLowerCase().includes(keyword) ||
      (p.authorName || '').toLowerCase().includes(keyword);
    return matchesTag && matchesKeyword;
  });

  // ==========================================
  // [탭 3: 태그 관리 핸들러]
  // ==========================================
  const handleOpenCreateTag = () => {
    setEditingTag(null);
    setNewTagName('');
    setNewTagEmojiIdx(0);
    setShowTagModal(true);
  };

  const handleOpenEditTag = (tag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setNewTagEmojiIdx(tag.emojiIdx ?? (tag.emoji ? EMOJI_LIST.indexOf(tag.emoji) : 0));
    setShowTagModal(true);
  };

  const handleSaveTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      alert('태그 이름을 입력해주세요.');
      return;
    }

    try {
      if (editingTag) {
        // 태그 수정
        const tagId = editingTag.tagId ?? editingTag.id;
        const updated = await gatheringApi.updateTag(tagId, {
          name: newTagName.trim(),
          emoji: getEmojiByIdx(newTagEmojiIdx),
          emojiIdx: newTagEmojiIdx
        });
        setTags((prev) =>
          prev.map((t) => ((t.tagId ?? t.id) === tagId ? { ...t, ...updated } : t))
        );
        alert('태그가 성공적으로 수정되었습니다.');
      } else {
        // 새 태그 생성
        const created = await gatheringApi.createTag({
          name: newTagName.trim(),
          emoji: getEmojiByIdx(newTagEmojiIdx),
          emojiIdx: newTagEmojiIdx,
          color: 'badge-real'
        });
        setTags((prev) => [...prev, created]);
        alert('새 태그가 성공적으로 등록되었습니다.');
      }
      setEditingTag(null);
      setNewTagName('');
      setShowTagModal(false);
    } catch (err) {
      console.error('태그 저장 실패:', err);
      alert('태그 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteTag = async (tag) => {
    const tagId = tag.tagId ?? tag.id;
    // 사용 중인 게시글 수 확인
    const count = posts.filter((p) => String(p.tagId) === String(tagId)).length;
    let confirmMsg = `태그 '${tag.emoji || ''} ${tag.name}'을(를) 삭제하시겠습니까?`;
    if (count > 0) {
      confirmMsg += `\n⚠️ 현재 이 태그를 사용하는 게시글이 ${count}개 있습니다.`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      await gatheringApi.deleteTag(tagId);
      setTags((prev) => prev.filter((t) => (t.tagId ?? t.id) !== tagId));
      alert('태그가 삭제되었습니다.');
    } catch (err) {
      console.error('태그 삭제 실패:', err);
      alert('태그 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Loading />
        <p className="mt-3 text-muted">게시판 관리 데이터를 불러오는 중입니다...</p>
      </Container>
    );
  }

  return (
    <Container className="admin-container admin-board-container py-4">
      {/* 상단 타이틀 */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h2 className="admin-page-title mb-1">게시판 관리 (돼지들 모임 🐷)</h2>
          <p className="admin-page-subtitle mb-0">
            알바생 커뮤니티의 신고 내역을 심사하고, 부적절한 게시글/댓글 검수 및 태그를 관리합니다.
          </p>
        </div>
        <Button
          variant="outline-secondary"
          size="sm"
          className="rounded-pill d-inline-flex align-items-center gap-1 mt-2 mt-sm-0"
          onClick={loadAllData}
        >
          <RiRefreshLine size={16} /> 새로고침
        </Button>
      </div>

      {/* 요약 통계 카드 */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={4}>
          <div className="admin-board-stat-card">
            <div className="stat-icon-wrapper primary">
              <RiChat1Line />
            </div>
            <div className="stat-info">
              <div className="stat-label">등록된 이야기</div>
              <div className="stat-value">{posts.length}건</div>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={4}>
          <div className="admin-board-stat-card">
            <div className="stat-icon-wrapper success">
              <RiPriceTag3Line />
            </div>
            <div className="stat-info">
              <div className="stat-label">활성 태그</div>
              <div className="stat-value">{tags.length}개</div>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={4}>
          <div className="admin-board-stat-card">
            <div className="stat-icon-wrapper danger">
              <RiAlertLine />
            </div>
            <div className="stat-info">
              <div className="stat-label">미처리 신고</div>
              <div className="stat-value">{pendingReportsCount}건</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* 탭 네비게이션 */}
      <div className="admin-board-nav-tabs">
        <button
          type="button"
          className={`admin-board-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <RiChat1Line size={18} />
          <span>게시글 & 댓글 관리</span>
        </button>
        <button
          type="button"
          className={`admin-board-tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          <RiPriceTag3Line size={18} />
          <span>태그 관리</span>
        </button>
        <button
          type="button"
          className={`admin-board-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <RiAlertLine size={18} />
          <span>신고 관리</span>
          {pendingReportsCount > 0 && (
            <span className="admin-board-tab-badge">{pendingReportsCount}</span>
          )}
        </button>
      </div>

      {/* ========================================================
          탭 1: 신고 내역 관리 (Reports)
         ======================================================== */}
      {activeTab === 'reports' && (
        <Card className="admin-board-table-card border-0">
          <Card.Header className="bg-transparent py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="fw-bold fs-6">접수된 신고 내역 ({filteredReports.length}건)</div>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-semibold">상태 필터:</span>
              <Form.Select
                size="sm"
                className="w-auto rounded-pill"
                value={reportFilter}
                onChange={(e) => setReportFilter(e.target.value)}
              >
                <option value="ALL">전체 보기</option>
                <option value="PENDING">대기중 (미처리)</option>
                <option value="RESOLVED">조치 완료</option>
                <option value="DISMISSED">반려됨</option>
              </Form.Select>
            </div>
          </Card.Header>
          <div className="table-responsive">
            <Table hover className="admin-board-table text-nowrap">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>유형</th>
                  <th style={{ width: '140px' }}>신고 사유</th>
                  <th>신고 대상 (제목 / 내용)</th>
                  <th style={{ width: '130px' }}>접수일시</th>
                  <th style={{ width: '100px' }} className="text-center">상태</th>
                  <th style={{ width: '180px' }} className="text-end">관리 조치</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      접수된 신고 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const status = report.status || 'PENDING';
                    const isPending = status === 'PENDING';

                    return (
                      <tr key={report.id}>
                        <td>
                          <span className={`report-type-badge ${report.targetType === 'POST' ? 'post' : 'comment'}`}>
                            {report.targetType === 'POST' ? '게시글' : '댓글'}
                          </span>
                        </td>
                        <td className="fw-semibold text-danger">
                          {report.reason}
                        </td>
                        <td>
                          <div
                            className="text-truncate text-dark fw-medium"
                            style={{ maxWidth: '300px', cursor: 'pointer' }}
                            onClick={() => setSelectedReport(report)}
                            title="클릭하여 상세 보기"
                          >
                            {report.details ? `[상세] ${report.details}` : `대상 ID: ${report.targetId || report.postId}`}
                          </div>
                        </td>
                        <td className="small text-muted">
                          {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="text-center">
                          <span className={`report-status-badge ${status.toLowerCase()}`}>
                            {status === 'PENDING' ? '대기중' : status === 'RESOLVED' ? '조치완료' : '반려'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="rounded-pill px-2 py-1"
                              onClick={() => setSelectedReport(report)}
                              title="상세 확인"
                            >
                              <RiEyeLine /> 상세
                            </Button>
                            {isPending && (
                              <>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="rounded-pill px-2 py-1"
                                  onClick={() => handleDeleteReportedTarget(report)}
                                  title="원문 삭제 후 조치 완료"
                                >
                                  <RiDeleteBinLine /> 삭제
                                </Button>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  className="rounded-pill px-2 py-1"
                                  onClick={() => handleResolveReport(report.id, 'DISMISSED')}
                                  title="신고 반려"
                                >
                                  반려
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* ========================================================
          탭 2: 게시글 & 댓글 관리 (Posts & Comments)
         ======================================================== */}
      {activeTab === 'posts' && (
        <Card className="admin-board-table-card border-0">
          <Card.Header className="bg-transparent py-3 border-bottom">
            <div className="admin-board-filter-bar mb-0">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold fs-6">전체 이야기 ({filteredPosts.length}건)</span>
                <Form.Select
                  size="sm"
                  className="w-auto rounded-pill ms-2"
                  value={postTagFilter}
                  onChange={(e) => setPostTagFilter(e.target.value)}
                >
                  <option value="ALL">전체 태그</option>
                  {tags.map((t) => (
                    <option key={t.tagId ?? t.id} value={t.tagId ?? t.id}>
                      {t.emoji} {t.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Check
                  type="switch"
                  id="include-deleted-switch"
                  label="삭제된 글 포함"
                  className="ms-3 small text-muted align-self-center user-select-none"
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
                <Form.Check
                  type="switch"
                  id="show-real-author-switch"
                  label={<span>🔐 전체 실명 확인 <span className="text-danger fw-bold" style={{ fontSize: '0.72rem' }}>열람 로그 저장</span></span>}
                  className="ms-2 small align-self-center user-select-none"
                  checked={showRealAuthor}
                  onChange={(e) => {
                    handleToggleShowRealAuthor(e.target.checked);
                  }}
                />
              </div>

              <InputGroup size="sm" className="admin-board-search-input">
                <InputGroup.Text className="bg-white border-end-0">
                  <RiSearchLine className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="제목, 내용, 작성자 검색..."
                  className="border-start-0"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </InputGroup>
            </div>
          </Card.Header>
          <div className="table-responsive">
            <Table hover className="admin-board-table text-nowrap">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th style={{ width: '130px' }}>태그</th>
                  <th>제목 & 본문 요약</th>
                  <th style={{ width: '130px' }}>작성자</th>
                  <th style={{ width: '110px' }}>작성일</th>
                  <th style={{ width: '80px' }} className="text-center">댓글</th>
                  <th style={{ width: '140px' }} className="text-end">관리 조치</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      검색 조건에 일치하는 이야기가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredPosts.map((post) => (
                    <tr key={post.id} className={post.isDeleted ? 'table-light opacity-75' : ''}>
                      <td className="text-muted small">#{post.id}</td>
                      <td>
                        <Badge bg="light" text="dark" className="border px-2 py-1">
                          {post.tagEmoji || getEmojiByIdx(post.emojiIdx)} {post.tagName}
                        </Badge>
                      </td>
                      <td>
                        <div className="fw-bold text-dark d-flex align-items-center gap-1">
                          {post.isDeleted && <Badge bg="danger" className="me-1">삭제됨</Badge>}
                          <span>{post.title}</span>
                        </div>
                        <div className="text-muted small text-truncate" style={{ maxWidth: '350px' }}>
                          {post.content}
                        </div>
                      </td>
                      <td>
                        {post.isAnonymous ? (
                          unmaskedRows[post.id] !== undefined || showRealAuthor ? (
                            <>
                              <span className="fw-semibold text-dark">
                                {unmaskedRows[post.id] || post.authorName}
                              </span>
                              <span className="badge bg-warning-subtle text-warning border border-warning ms-1" style={{ fontSize: '0.68rem' }}>
                                실명열람
                              </span>
                            </>
                          ) : (
                            <div className="d-flex align-items-center gap-1">
                              <span className="text-muted fst-italic">익명</span>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                className="rounded-pill px-1 py-0 d-inline-flex align-items-center"
                                style={{ fontSize: '0.7rem' }}
                                onClick={() => handleUnmaskRow(post)}
                                title="익명 실명 확인"
                              >
                                <RiEyeLine size={12} className="me-1" /> 열람
                              </Button>
                            </div>
                          )
                        ) : (
                          <span className="fw-semibold text-dark">{post.authorName}</span>
                        )}
                      </td>
                      <td className="small text-muted">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="light"
                          size="sm"
                          className="rounded-pill px-2 py-0 border"
                          onClick={() => handleOpenCommentsModal(post)}
                          title="댓글 확인"
                        >
                          💬 {post.commentCount || 0}
                        </Button>
                      </td>
                      <td className="text-end">
                        {post.isDeleted ? (
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1"
                            onClick={() => handleRestorePost(post.id)}
                            title="게시글 복구"
                          >
                            <RiRestartLine /> 복구
                          </Button>
                        ) : (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1"
                            onClick={() => handleDeletePost(post.id)}
                            title="게시글 삭제"
                          >
                            <RiDeleteBinLine /> 삭제
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* ========================================================
          탭 3: 태그 관리 (Tags)
         ======================================================== */}
      {activeTab === 'tags' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span className="fw-bold fs-6">카테고리 태그 목록 ({tags.length}개)</span>
              <p className="text-muted small mb-0">게시판에서 알바생들이 선택할 수 있는 이야기 주제 태그입니다.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="rounded-pill d-inline-flex align-items-center gap-1 px-3 fw-bold"
              onClick={handleOpenCreateTag}
            >
              <RiAddLine size={16} /> 새 태그 추가
            </Button>
          </div>

          <div className="admin-tag-grid">
            {tags.map((tag) => {
              const tagId = tag.tagId ?? tag.id;
              const postCount = posts.filter((p) => String(p.tagId) === String(tagId)).length;

              return (
                <div key={tagId} className="admin-tag-card">
                  <div className="admin-tag-info">
                    <span className="admin-tag-emoji">{tag.emoji || getEmojiByIdx(tag.emojiIdx ?? 0)}</span>
                    <div>
                      <div className="admin-tag-name">{tag.name}</div>
                      <div className="admin-tag-sub">게시글 {postCount}개 등록됨</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="rounded-circle p-2"
                      onClick={() => handleOpenEditTag(tag)}
                      title="태그 수정"
                    >
                      <RiEdit2Line size={15} />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="rounded-circle p-2"
                      onClick={() => handleDeleteTag(tag)}
                      title="태그 삭제"
                    >
                      <RiDeleteBinLine size={15} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          모달 1: 신고 세부 확인 모달
         ======================================================== */}
      {/* 실명 열람 사유 입력 */}
      <Modal show={Boolean(unmaskModal)} onHide={closeUnmaskModal} centered backdrop="static">
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold fs-6">
            {unmaskModal?.type === 'all' ? '전체 실명 확인' : '익명 실명 확인'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="mb-2 text-dark small">익명 작성자의 실명을 확인합니다.</p>
          <p className="mb-3 text-danger small fw-semibold">{UNMASK_POLICY}</p>
          {unmaskModal?.type === 'row' && unmaskModal.post && (
            <p className="mb-3 text-muted small">
              대상 게시글 #{unmaskModal.post.id}
              {unmaskModal.post.title ? ` · ${unmaskModal.post.title}` : ''}
            </p>
          )}
          <Form.Group controlId="unmaskReasonInput">
            <Form.Label className="fw-semibold small">
              열람 사유 <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={unmaskReason}
              onChange={(e) => setUnmaskReason(e.target.value)}
              placeholder="예: 신고 조사 — 게시글 #12 규정 위반 여부 확인"
              disabled={unmaskSubmitting}
              autoFocus
            />
            <Form.Text className="text-muted">
              입력한 내용이 감사 로그에 그대로 기재됩니다.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button
            variant="secondary"
            className="rounded-pill px-3"
            onClick={closeUnmaskModal}
            disabled={unmaskSubmitting}
          >
            취소
          </Button>
          <Button
            variant="warning"
            className="rounded-pill px-3"
            onClick={submitUnmask}
            disabled={unmaskSubmitting || !unmaskReason.trim()}
          >
            {unmaskSubmitting ? '처리 중…' : '실명 확인'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(selectedReport)} onHide={() => setSelectedReport(null)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold fs-6">
            🚨 신고 세부 내용 확인 (#{selectedReport?.id})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedReport && (
            <div>
              <div className="mb-3">
                <span className="text-muted small d-block mb-1">신고 대상 유형</span>
                <Badge bg={selectedReport.targetType === 'POST' ? 'primary' : 'warning'} className="px-2 py-1">
                  {selectedReport.targetType === 'POST' ? '게시글 (POST)' : '댓글 (COMMENT)'}
                </Badge>
              </div>

              <div className="mb-3">
                <span className="text-muted small d-block mb-1">선택된 사유</span>
                <div className="fw-bold text-danger fs-6">{selectedReport.reason}</div>
              </div>

              <div className="mb-3">
                <span className="text-muted small d-block mb-1">신고자가 남긴 상세 설명</span>
                <div className="p-3 bg-light rounded-3 border small text-dark">
                  {selectedReport.details || '상세 사유가 작성되지 않았습니다.'}
                </div>
              </div>

              <div className="mb-3">
                <span className="text-muted small d-block mb-1">접수 일시 / 상태</span>
                <div className="small text-muted">
                  접수일: {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : '-'} | 상태:{' '}
                  <span className="fw-bold text-dark">{selectedReport.status || 'PENDING'}</span>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top">
          {selectedReport && (selectedReport.status || 'PENDING') === 'PENDING' && (
            <>
              <Button
                variant="danger"
                className="rounded-pill px-3"
                onClick={() => handleDeleteReportedTarget(selectedReport)}
              >
                <RiDeleteBinLine /> 원문 삭제 및 조치완료
              </Button>
              <Button
                variant="outline-secondary"
                className="rounded-pill px-3"
                onClick={() => handleResolveReport(selectedReport.id, 'DISMISSED')}
              >
                신고 반려
              </Button>
            </>
          )}
          <Button variant="secondary" className="rounded-pill px-3" onClick={() => setSelectedReport(null)}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ========================================================
          모달 2: 게시글 댓글 목록 확인 및 개별 삭제 모달
         ======================================================== */}
      <Modal show={Boolean(viewCommentsPost)} onHide={() => setViewCommentsPost(null)} size="lg" centered scrollable>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold fs-6">
            💬 게시글 댓글 관리 (게시글 ID: #{viewCommentsPost?.id})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {viewCommentsPost && (
            <div className="mb-4 p-3 bg-light rounded-3 border">
              <div className="fw-bold text-dark mb-1">{viewCommentsPost.title}</div>
              <div className="text-muted small">{viewCommentsPost.content}</div>
            </div>
          )}

          <div className="fw-bold mb-2 d-flex justify-content-between align-items-center">
            <span>등록된 댓글 목록</span>
            <span className="badge bg-secondary-subtle text-secondary">{postComments.length}개</span>
          </div>
          {loadingComments ? (
            <div className="text-center py-4 text-muted">댓글을 불러오는 중입니다...</div>
          ) : postComments.length === 0 ? (
            <div className="text-center py-4 text-muted">작성된 댓글이 없습니다.</div>
          ) : (
            <div
              className="d-flex flex-column gap-2"
              style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}
            >
              {postComments.map((comment) => {
                const commentRevealed =
                  !comment.isAnonymous || unmaskedComments[comment.id] !== undefined;
                const commentDisplayName = comment.isAnonymous
                  ? (unmaskedComments[comment.id] || comment.authorName)
                  : comment.authorName;
                return (
                  <div
                    key={comment.id}
                    className="p-3 border rounded-3 d-flex align-items-center justify-content-between bg-white"
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        {!commentRevealed ? (
                          <span className="small text-muted fst-italic">익명</span>
                        ) : (
                          <>
                            <span className="fw-bold small">{commentDisplayName}</span>
                            {comment.isAnonymous && (
                              <span className="badge bg-warning-subtle text-warning border border-warning" style={{ fontSize: '0.65rem' }}>
                                실명열람
                              </span>
                            )}
                          </>
                        )}
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <div className="text-dark small">{comment.content}</div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="rounded-pill px-2 py-1 ms-3 flex-shrink-0"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="댓글 삭제"
                    >
                      <RiDeleteBinLine /> 삭제
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="secondary" className="rounded-pill px-3" onClick={() => setViewCommentsPost(null)}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ========================================================
          모달 3: 새 태그 추가 / 수정 모달
         ======================================================== */}
      <Modal show={showTagModal} onHide={() => { setShowTagModal(false); setEditingTag(null); }} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold fs-6">
            {editingTag ? '🏷️ 태그 수정' : '🏷️ 새 태그 추가'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveTag}>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small">대표 이모지 선택</Form.Label>
              <div className="d-flex align-items-center gap-3">
                <span style={{ fontSize: '2.2rem' }}>{getEmojiByIdx(newTagEmojiIdx)}</span>
                <span className="text-muted small">아래 팔레트에서 태그를 상징하는 이모지를 선택하세요.</span>
              </div>
              <div className="admin-emoji-palette mt-2">
                {EMOJI_LIST.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`admin-emoji-btn ${newTagEmojiIdx === idx ? 'active' : ''}`}
                    onClick={() => setNewTagEmojiIdx(idx)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="fw-bold small">태그 이름</Form.Label>
              <Form.Control
                type="text"
                placeholder="예: 칼퇴 꿀팁, 고기 굽기, 알바 고민..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                maxLength={20}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top">
            <Button variant="secondary" className="rounded-pill px-3" onClick={() => { setShowTagModal(false); setEditingTag(null); }}>
              취소
            </Button>
            <Button variant="primary" type="submit" className="rounded-pill px-3 fw-bold">
              {editingTag ? '수정 완료' : '등록하기'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default AdminBoard;
