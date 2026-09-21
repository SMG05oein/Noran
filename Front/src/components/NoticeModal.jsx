import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import MaintenanceOverlay from './MaintenanceOverlay';
import useDevAuthStore from '../store/useDevAuthStore';

const NoticeModal = () => {
  const [notices, setNotices] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [checking, setChecking] = useState(false);
  const location = useLocation();

  const API_BASE_URL = import.meta.env.MODE === 'production' ? '' : (import.meta.env.VITE_API_URL || '');

  const checkAndLoadNotices = async () => {
    // 1. 오직 개발자 전용 관리 페이지(/dev/*)만 점검 모드/공지사항 적용 제외
    if (location.pathname.startsWith('/dev')) {
      setShow(false);
      setIsMaintenance(false);
      return;
    }

    setChecking(true);
    try {
      // ① 공개용 긴급 점검 모드 확인 API 호출 (GET /api/dev/announcements/maintenance-status)
      const statusRes = await axios.get(`${API_BASE_URL}/api/dev/announcements/maintenance-status`);
      
      if (statusRes.data?.maintenanceMode) {
        const isBypassed = sessionStorage.getItem('maintenance_bypassed') === 'true';
        if (!isBypassed) {
          // 점검 모드가 ON이고 현재 세션에서 우회(로그인)하지 않은 경우 차단
          setIsMaintenance(true);
          setShow(false);
          setChecking(false);
          return;
        } else {
          // 우회된 상태라면 유지 중인 차단막을 해제합니다.
          setIsMaintenance(false);
        }
      } else {
        // 점검 모드가 OFF되면 우회 플래그 초기화 (다시 켜졌을 때 차단하기 위함)
        sessionStorage.removeItem('maintenance_bypassed');
        setIsMaintenance(false);
      }

      // ② 점검 모드가 OFF일 때, 로그인(/login) 및 회원가입(/signup) 페이지는 공지사항 팝업을 띄우지 않고 종료
      if (location.pathname === '/login' || location.pathname === '/signup') {
        setShow(false);
        setChecking(false);
        return;
      }

      // ③ 로그인한 서비스 페이지(/admin, / 등)에서는 공개용 공지사항 목록 API 호출 (GET /api/dev/announcements/public)
      const noticesRes = await axios.get(`${API_BASE_URL}/api/dev/announcements/public`);
      if (Array.isArray(noticesRes.data)) {
        const now = Date.now();
        const validNotices = noticesRes.data.filter((notice) => {
          if (!notice.isActive) return false;

          const hideUntil = localStorage.getItem(`hide_notice_${notice.id}`);
          if (hideUntil && now < Number(hideUntil)) {
            return false; // 24시간 안 보기 적용 중
          }

          const sessionClosed = sessionStorage.getItem(`session_hide_notice_${notice.id}`);
          if (sessionClosed) {
            return false; // 세션 중 이미 닫음
          }

          return true;
        });

        if (validNotices.length > 0) {
          setNotices(validNotices);
          setCurrentIndex(0);
          setShow(true);
        }
      }
    } catch (error) {
      // 조회 실패 시 무시
    }
    setChecking(false);
  };

  useEffect(() => {
    checkAndLoadNotices();
  }, [location.pathname]);

  const handleClose = () => {
    // 팝업 모달의 모든 공지에 대해 세션 닫기 적용
    notices.forEach((notice) => {
      sessionStorage.setItem(`session_hide_notice_${notice.id}`, 'true');
    });
    setShow(false);
  };

  const handleHide = (type) => {
    const currentNotice = notices[currentIndex];
    if (type === 'today') {
      localStorage.setItem(`hide_notice_${currentNotice.id}`, Date.now() + 24 * 60 * 60 * 1000);
    } else if (type === 'period') {
      let expire = Date.now() + 365 * 24 * 60 * 60 * 1000; // 기본 1년
      if (currentNotice.endDate) {
        const end = new Date(currentNotice.endDate);
        end.setHours(23, 59, 59, 999);
        expire = end.getTime();
      }
      localStorage.setItem(`hide_notice_${currentNotice.id}`, expire);
    }
    
    sessionStorage.setItem(`session_hide_notice_${currentNotice.id}`, 'true');

    if (currentIndex < notices.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < notices.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };



  if (isMaintenance) {
    return <MaintenanceOverlay onRecheck={checkAndLoadNotices} checking={checking} />;
  }

  if (!show || notices.length === 0) return null;

  const currentNotice = notices[currentIndex];

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      backdrop="static"
      keyboard={false}
      style={{ zIndex: 1060 }}
    >
      <Modal.Header closeButton style={{ backgroundColor: 'var(--color-primary)', color: '#fff', borderBottom: 'none' }}>
        <Modal.Title className="fw-bold d-flex align-items-center gap-2" style={{ fontSize: '1.1rem' }}>
          <span>📢 공지사항</span>
          {notices.length > 1 && (
            <Badge bg="light" className="text-dark fs-6">
              {currentIndex + 1} / {notices.length}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', minHeight: '160px', padding: '1.5rem' }}>
        <h5 className="fw-bold mb-3 text-primary">{currentNotice.title}</h5>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            color: 'var(--color-text-muted)'
          }}
        >
          {currentNotice.content}
        </div>
        {currentNotice.createdAt && (
          <div className="text-end text-muted small mt-4">
            등록일: {new Date(currentNotice.createdAt).toLocaleDateString('ko-KR')}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer
        className="d-flex justify-content-between align-items-center"
        style={{ backgroundColor: 'var(--color-surface-hover)', borderTop: '1px solid var(--color-border)' }}
      >
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" className="fw-bold px-3 py-2 rounded-pill" onClick={() => handleHide('today')}>
            오늘 하루 안 보기
          </Button>
          <Button variant="outline-secondary" size="sm" className="fw-bold px-3 py-2 rounded-pill" onClick={() => handleHide('period')}>
            기간 내 안 보기
          </Button>
        </div>

        <div className="d-flex align-items-center gap-2">
          {notices.length > 1 && (
            <>
              <Button
                variant="outline-secondary"
                size="sm"
                className="fw-bold px-2 rounded-3"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                ◀ 이전
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="fw-bold px-2 rounded-3"
                onClick={handleNext}
                disabled={currentIndex === notices.length - 1}
              >
                다음 ▶
              </Button>
            </>
          )}
          <Button variant="primary" className="fw-bold px-4 rounded-pill shadow-xs" onClick={handleClose}>
            닫기
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default NoticeModal;
