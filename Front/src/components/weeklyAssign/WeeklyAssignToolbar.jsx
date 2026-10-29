import React from 'react';
import { Form, Button } from 'react-bootstrap';
import { format, getWeekOfMonth, endOfWeek } from 'date-fns';
import { RiQuestionLine } from 'react-icons/ri';
import PageHeader from '../ui/PageHeader';
import StatusChip from '../ui/StatusChip';
import SegmentedFilter from '../ui/SegmentedFilter';
import WeekNavigator from '../ui/WeekNavigator';
import { FILTERS, DAY_FILTER_OPTIONS, LEGEND } from './weeklyAssignUtils';

const WeeklyAssignToolbar = ({
  weekAssignStatus,
  onOpenGuide,
  branches,
  selectedWpIdx,
  setSelectedWpIdx,
  currentWeekStart,
  isThisWeek,
  handlePickWeekDate,
  handlePrevWeek,
  handleNextWeek,
  handleGoThisWeek,
  dayFilter,
  setDayFilter,
  filterType,
  setFilterType,
  onlyApplied,
  setOnlyApplied
}) => {
  return (
    <>
      <PageHeader
        title="주간 스케줄 배정"
        status={
          <StatusChip tone={weekAssignStatus}>
            {{
              unset: '배정 전',
              draft: '임시 저장',
              partial: '임시 배정',
              confirmed: '확정',
            }[weekAssignStatus]}
          </StatusChip>
        }
      >
        <Button
          variant="outline-secondary"
          size="sm"
          className="rounded-pill px-3 d-inline-flex align-items-center gap-1"
          onClick={onOpenGuide}
        >
          <RiQuestionLine size={16} />
          사용 방법
        </Button>
      </PageHeader>

      <div className="ui-toolbar-card wat-toolbar-card">
        <div className="wat-toolbar-top-row">
          {branches.length > 0 && (
            <Form.Select
              className="wat-branch-select"
              value={selectedWpIdx || ''}
              onChange={(e) => setSelectedWpIdx(e.target.value)}
            >
              {branches.map(b => (
                <option key={b.wpIdx} value={b.wpIdx}>{b.wpName}</option>
              ))}
            </Form.Select>
          )}

          <WeekNavigator
            labelTop={`${format(currentWeekStart, 'yyyy')}년 ${getWeekOfMonth(currentWeekStart, { weekStartsOn: 1 })}주차`}
            labelBottom={`${format(currentWeekStart, 'MM/dd')} ~ ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MM/dd')}`}
            dateValue={format(currentWeekStart, 'yyyy-MM-dd')}
            onPickDate={handlePickWeekDate}
            onPrev={handlePrevWeek}
            onNext={handleNextWeek}
            showThisWeek={!isThisWeek}
            onThisWeek={handleGoThisWeek}
          />
        </div>

        <div className="wat-toolbar-bottom-row d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="wat-toolbar-day-filter align-items-center gap-1">
            <span className="small fw-bold text-muted me-1">요일:</span>
            <SegmentedFilter
              options={DAY_FILTER_OPTIONS.map(f => ({ value: f.value, label: f.name }))}
              value={dayFilter}
              onChange={setDayFilter}
            />
          </div>
          <div className="d-flex align-items-center gap-1 wat-toolbar-status-filter">
            <span className="small fw-bold text-muted me-1">출퇴근:</span>
            <SegmentedFilter
              options={FILTERS.map(f => ({ value: f.value, label: f.name }))}
              value={filterType}
              onChange={setFilterType}
            />
          </div>
          <button
            type="button"
            className={`wat-mobile-only-applied-btn ${onlyApplied ? 'is-active' : ''}`}
            onClick={() => setOnlyApplied(prev => !prev)}
            aria-pressed={onlyApplied}
          >
            {onlyApplied ? '✓ 신청자만' : '신청자만 보기'}
          </button>
        </div>
      </div>

      <div className="ui-legend" data-html2canvas-ignore="true">
        {LEGEND.map(item => (
          <span key={item.tone} className="ui-legend-item">
            <span className={`ui-legend-swatch wat-legend-swatch ${item.tone}`} />
            {item.label}
          </span>
        ))}
      </div>
    </>
  );
};

export default WeeklyAssignToolbar;

