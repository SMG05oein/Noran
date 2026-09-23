import React from 'react';

/**
 * Tinted status chip.
 * tone: unset | draft | partial | confirmed | success | warning | info | muted
 */
const StatusChip = ({ tone = 'muted', children, className = '' }) => (
  <span className={`ui-status-chip is-${tone} ${className}`.trim()}>
    {children}
  </span>
);

export default StatusChip;
