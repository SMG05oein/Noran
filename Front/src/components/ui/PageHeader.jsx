import React from 'react';

/**
 * Page title row with optional status / actions.
 * props: title, children (actions), status (ReactNode), className
 */
const PageHeader = ({ title, status = null, children = null, className = '' }) => (
  <div className={`ui-page-header ${className}`.trim()}>
    <div className="ui-page-header-left">
      <h4 className="ui-page-title">{title}</h4>
      {status}
    </div>
    {children && <div className="ui-page-header-actions">{children}</div>}
  </div>
);

export default PageHeader;
