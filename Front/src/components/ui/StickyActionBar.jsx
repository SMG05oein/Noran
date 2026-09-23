import React from 'react';

/**
 * Fixed bottom action bar.
 * left / right slots for secondary vs primary actions.
 */
const StickyActionBar = ({ left = null, right = null, className = '' }) => (
  <div className={`ui-action-bar ${className}`.trim()} data-html2canvas-ignore="true">
    <div className="ui-action-bar-left">{left}</div>
    <div className="ui-action-bar-right">{right}</div>
  </div>
);

export default StickyActionBar;
