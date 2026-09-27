import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Spinner } from 'react-bootstrap';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { globalApiClient as apiClient } from '../api/apiClient';

const HowToUse = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 관리자 권한 확인 (isAdmin === 1 또는 관리자 직급)
  const isAdmin = user?.isAdmin === 1 || user?.role === 'ADMIN' || user?.userRole === 'ADMIN';

  // 백엔드에서 텍스트(HTML) 파일 내용을 불러오는 함수
  const fetchContent = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/system/how-to-use');
      setContent(response.data.content || '');
    } catch (error) {
      console.error('이용방법을 불러오는데 실패했습니다.', error);
      // 임시 텍스트 (API가 없을 때 테스트용)
      setContent('<p>이용방법 백엔드 API가 아직 연결되지 않았습니다.</p>');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  // 백엔드로 HTML 내용을 전송하여 txt 파일에 저장하는 함수
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/api/system/how-to-use', { content });
      alert('저장되었습니다.');
      setIsEditing(false);
    } catch (error) {
      console.error('저장에 실패했습니다.', error);
      alert('저장에 실패했습니다. 백엔드 API 연동을 확인해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // React Quill 에디터 툴바 옵션
  const modules = {
    toolbar: [
      [{ 'size': ['small', false, 'large', 'huge'] }], // 폰트 크기 (기본 4단계)
      ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'], // 강조 등
      [{ 'color': [] }, { 'background': [] }], // 글자색, 배경색
      [{ 'script': 'sub' }, { 'script': 'super' }], // 첨자
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }], // 리스트, 들여쓰기
      [{ 'align': [] }], // 정렬
      ['link'], // 링크 (이미지, 동영상 제거)
      ['clean'] // 포맷 초기화
    ],
  };

  return (
    <Container className="py-4 py-md-5">
      <style>
        {`
          .quill-editor-wrapper .quill {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .quill-editor-wrapper .ql-container {
            flex: 1;
            overflow-y: auto;
          }
        `}
      </style>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button variant="outline-secondary" onClick={() => navigate(-1)}>
            이전
          </Button>
          <h2 className="fw-bold text-dark mb-0">시스템 이용방법</h2>
        </div>
        {isAdmin && !isEditing && (
          <Button variant="outline-primary" onClick={() => setIsEditing(true)}>
            수정하기
          </Button>
        )}
        {isAdmin && isEditing && (
          <div>
            <Button variant="secondary" className="me-2" onClick={() => setIsEditing(false)} disabled={saving}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" /> : '저장'}
            </Button>
          </div>
        )}
      </div>

      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Body className="p-4">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : isEditing ? (
            <div className="quill-editor-wrapper" style={{ height: '500px', minHeight: '300px', resize: 'vertical', overflow: 'hidden' }}>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
              />
            </div>
          ) : (
            <div className="ql-snow">
              <div
                className="ql-editor"
                dangerouslySetInnerHTML={{ __html: content }}
                style={{ minHeight: '300px', padding: 0 }}
              />
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HowToUse;
