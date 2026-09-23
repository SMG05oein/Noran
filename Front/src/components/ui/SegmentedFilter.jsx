import React from 'react';

/**
 * Segmented filter control.
 * options: [{ value, label }]
 */
const SegmentedFilter = ({ options, value, onChange, className = '' }) => (
  <div className={`ui-segmented ${className}`.trim()} role="group">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        className={`ui-segmented-btn ${value === opt.value ? 'is-active' : ''}`}
        onClick={() => onChange(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default SegmentedFilter;
