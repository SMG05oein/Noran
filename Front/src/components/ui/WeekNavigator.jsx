import React from 'react';
import { Button, OverlayTrigger, Popover, Form } from 'react-bootstrap';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';

/**
 * Week navigation: prev / label+date picker / next / optional this-week.
 */
const WeekNavigator = ({
  labelTop,
  labelBottom,
  dateValue,
  onPickDate,
  onPrev,
  onNext,
  showThisWeek = false,
  onThisWeek,
  className = '',
}) => (
  <div className={`ui-week-nav ${className}`.trim()}>
    <Button variant="link" className="p-1 ui-week-nav-arrow" onClick={onPrev} aria-label="이전 주">
      <RiArrowLeftSLine size={22} />
    </Button>
    <OverlayTrigger
      trigger="click"
      rootClose
      placement="bottom"
      overlay={
        <Popover id="ui-week-pick-popover">
          <Popover.Body className="p-2">
            <Form.Control
              type="date"
              className="fw-bold"
              value={dateValue}
              onChange={(e) => onPickDate(e.target.value)}
            />
          </Popover.Body>
        </Popover>
      }
    >
      <button type="button" className="ui-week-label">
        <span className="ui-week-label-top">{labelTop}</span>
        <span className="ui-week-label-bottom">{labelBottom}</span>
      </button>
    </OverlayTrigger>
    <Button variant="link" className="p-1 ui-week-nav-arrow" onClick={onNext} aria-label="다음 주">
      <RiArrowRightSLine size={22} />
    </Button>
    {showThisWeek && (
      <Button variant="outline-primary" size="sm" className="ui-this-week-btn" onClick={onThisWeek}>
        이번 주
      </Button>
    )}
  </div>
);

export default WeekNavigator;
