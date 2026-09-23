import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Form } from 'react-bootstrap';
import { createPortal } from 'react-dom';

const TIME_OPTIONS = [];
for (let h = 10; h <= 23; h++) {
  const hour = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hour}:00`);
  TIME_OPTIONS.push(`${hour}:30`);
}

const LIST_OPTIONS = ['미출근', ...TIME_OPTIONS];

/**
 * 직접 입력 + 클릭 시 10:00~23:30 전체 목록(필터 없음)
 */
const AssignTimeInput = ({
  value,
  placeholder,
  disabled,
  readOnly,
  title,
  className = '',
  onPick,
}) => {
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxH = 180;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < maxH && r.top > spaceBelow;
    setPos({
      top: openUp ? r.top - 4 : r.bottom + 2,
      left: r.left,
      width: r.width,
      openUp,
      maxH,
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePos();
    const onScroll = () => updatePos();
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const apply = (val) => {
    onPick?.(val);
    setOpen(false);
  };

  const dropdown = open && !disabled && !readOnly
    ? createPortal(
      <div
        ref={listRef}
        className="assign-time-dropdown"
        role="listbox"
        style={{
          position: 'fixed',
          top: pos.openUp ? undefined : pos.top,
          bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
          left: pos.left,
          width: pos.width,
          maxHeight: pos.maxH || 180,
          zIndex: 2000,
        }}
      >
        {LIST_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`assign-time-option ${value === opt || (opt === '미출근' && !value) ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              apply(opt);
            }}
          >
            {opt}
          </button>
        ))}
      </div>,
      document.body
    )
    : null;

  return (
    <div className="assign-time-input position-relative" ref={wrapRef}>
      <Form.Control
        size="sm"
        value={value || ''}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        autoComplete="off"
        onFocus={() => {
          if (!disabled && !readOnly) setOpen(true);
        }}
        onClick={() => {
          if (!disabled && !readOnly) setOpen(true);
        }}
        onChange={(e) => {
          if (disabled || readOnly) return;
          onPick?.(e.target.value);
        }}
        className={className}
      />
      {dropdown}
    </div>
  );
};

export { TIME_OPTIONS };
export default AssignTimeInput;
