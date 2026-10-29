import React from 'react';
import { Offcanvas, Button, Spinner } from 'react-bootstrap';
import { RiDownload2Line, RiUserAddLine, RiTimeLine, RiQuestionLine } from 'react-icons/ri';
import { TIME_OPTIONS } from '../AssignTimeInput';
import { openStartTimeForDate } from '../../utils/shiftReset';

export const MobileMoreSheet = ({
  show,
  onHide,
  onDownloadExcel,
  onOpenAddWorker,
  onSavePartial,
  onOpenGuide,
  excelDownloading,
  saving,
  loading
}) => {
  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="bottom"
      className="wat-more-offcanvas"
    >
      <div className="wat-sheet-drag-handle" />
      <Offcanvas.Header closeButton className="pb-2 pt-1 border-bottom">
        <Offcanvas.Title className="fw-bold fs-6">더보기 메뉴</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-3 d-flex flex-column gap-2">
        <Button
          variant="light"
          className="wat-sheet-menu-item"
          onClick={() => {
            onHide();
            onDownloadExcel();
          }}
          disabled={excelDownloading || loading}
        >
          <div className="wat-sheet-menu-icon is-green">
            {excelDownloading ? <Spinner size="sm" /> : <RiDownload2Line size={20} />}
          </div>
          <div className="wat-sheet-menu-text">
            <span className="wat-sheet-menu-title">주간 배정표 엑셀 다운로드</span>
            <span className="wat-sheet-menu-desc">현재 주의 전체 배정 상태를 엑셀 파일로 저장</span>
          </div>
        </Button>

        <Button
          variant="light"
          className="wat-sheet-menu-item"
          onClick={() => {
            onHide();
            onOpenAddWorker();
          }}
        >
          <div className="wat-sheet-menu-icon is-blue">
            <RiUserAddLine size={20} />
          </div>
          <div className="wat-sheet-menu-text">
            <span className="wat-sheet-menu-title">타 지점 알바생 추가</span>
            <span className="wat-sheet-menu-desc">다른 매장의 알바생을 이번 주 그리드에 파견 추가</span>
          </div>
        </Button>

        <Button
          variant="light"
          className="wat-sheet-menu-item"
          onClick={() => {
            onHide();
            onSavePartial();
          }}
          disabled={saving || loading}
        >
          <div className="wat-sheet-menu-icon is-teal">
            <RiTimeLine size={20} />
          </div>
          <div className="wat-sheet-menu-text">
            <span className="wat-sheet-menu-title">임시 배정 (출근 확정만 공개)</span>
            <span className="wat-sheet-menu-desc">출근 배정된 날만 알바생에게 공개, 미배정 날은 신청 유지</span>
          </div>
        </Button>

        <Button
          variant="light"
          className="wat-sheet-menu-item"
          onClick={() => {
            onHide();
            onOpenGuide();
          }}
        >
          <div className="wat-sheet-menu-icon is-gray">
            <RiQuestionLine size={20} />
          </div>
          <div className="wat-sheet-menu-text">
            <span className="wat-sheet-menu-title">주간 스케줄 배정 사용 방법</span>
            <span className="wat-sheet-menu-desc">배정 규칙 및 저장 모드 가이드 확인</span>
          </div>
        </Button>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export const MobileTimeSheet = ({
  mobileTimeSheet,
  setMobileTimeSheet,
  activeSheetShift,
  mobileDateStr,
  handleUpdateShift
}) => {
  const sheetDateStr = mobileTimeSheet.dateStr || mobileDateStr || '';
  const openTime = sheetDateStr ? openStartTimeForDate(sheetDateStr) : '10:00';

  return (
    <Offcanvas
      show={mobileTimeSheet.show}
      onHide={() => setMobileTimeSheet(prev => ({ ...prev, show: false }))}
      placement="bottom"
      className="wat-time-offcanvas"
    >
      <div className="wat-sheet-drag-handle" />
      <Offcanvas.Header closeButton className="pb-2 pt-1 border-bottom">
        <Offcanvas.Title className="fw-bold fs-6">
          <span className="text-primary">{mobileTimeSheet.userName}</span>님 근무 시간 / 상태 선택
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-3">
        {/* 1. 빠른 상태 프리셋 */}
        <div className="mb-3">
          <div className="small fw-bold text-muted mb-2">상태 변경</div>
          <div className="wat-time-sheet-presets">
            <button
              type="button"
              className={`wat-sheet-preset-btn ${activeSheetShift?.wsdIsOpen ? 'active-open' : ''}`}
              onClick={() => {
                if (!activeSheetShift) return;
                handleUpdateShift(mobileTimeSheet.uid, sheetDateStr, activeSheetShift._id, {
                  wsdStartTime: openStartTimeForDate(sheetDateStr),
                  wsdStatus: '출근',
                  wsdIsOpen: true
                });
                setMobileTimeSheet(prev => ({ ...prev, show: false }));
              }}
            >
              오픈 ({openTime})
            </button>
            <button
              type="button"
              className={`wat-sheet-preset-btn ${activeSheetShift?.wsdIsClose ? 'active-close' : ''}`}
              onClick={() => {
                if (!activeSheetShift) return;
                handleUpdateShift(mobileTimeSheet.uid, sheetDateStr, activeSheetShift._id, {
                  wsdStatus: '출근',
                  wsdIsClose: true
                });
                setMobileTimeSheet(prev => ({ ...prev, show: false }));
              }}
            >
              마감
            </button>
            <button
              type="button"
              className={`wat-sheet-preset-btn ${activeSheetShift?.wsdStatus === '미출근' ? 'active-off' : ''}`}
              onClick={() => {
                if (!activeSheetShift) return;
                handleUpdateShift(mobileTimeSheet.uid, sheetDateStr, activeSheetShift._id, {
                  wsdStartTime: '',
                  wsdStatus: '미출근',
                  wsdIsOpen: false,
                  wsdIsClose: false
                });
                setMobileTimeSheet(prev => ({ ...prev, show: false }));
              }}
            >
              미출근
            </button>
            <button
              type="button"
              className="wat-sheet-preset-btn text-muted"
              onClick={() => {
                if (!activeSheetShift) return;
                handleUpdateShift(mobileTimeSheet.uid, sheetDateStr, activeSheetShift._id, {
                  wsdStartTime: '',
                  wsdStatus: null,
                  wsdIsOpen: false,
                  wsdIsClose: false
                });
                setMobileTimeSheet(prev => ({ ...prev, show: false }));
              }}
            >
              선택 취소(빈값)
            </button>
          </div>
        </div>

        {/* 2. 출근 시작 시간 그리드 */}
        <div>
          <div className="small fw-bold text-muted mb-2">출근 시작 시간 선택 (10:00 ~ 00:00)</div>
          <div className="wat-time-sheet-grid">
            {TIME_OPTIONS.map(time => {
              const isSelected = activeSheetShift?.wsdStartTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  className={`wat-sheet-time-slot ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    if (!activeSheetShift) return;
                    handleUpdateShift(mobileTimeSheet.uid, sheetDateStr, activeSheetShift._id, {
                      wsdStartTime: time,
                      wsdStatus: '출근'
                    });
                    setMobileTimeSheet(prev => ({ ...prev, show: false }));
                  }}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

