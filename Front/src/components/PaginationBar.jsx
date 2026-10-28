import React from 'react';
import { Button, Form } from 'react-bootstrap';

const PaginationBar = ({ page, totalPages, pageInput, setPage, setPageInput }) => {
  return (
    <div className="d-flex justify-content-center align-items-center mt-3 mt-md-4 gap-2 gap-sm-3 flex-nowrap">
      <Button
        variant={page === 0 ? "outline-secondary" : "outline-primary"}
        disabled={page === 0}
        onClick={() => {
          const newPage = page - 1;
          setPage(newPage);
          setPageInput(String(newPage + 1));
        }}
        className="fw-bold px-3 py-1.5 px-md-4 py-md-2 rounded-pill shadow-sm text-nowrap d-inline-flex align-items-center justify-content-center"
        style={{ flexShrink: 0 }}
      >
        &laquo; 이전
      </Button>
      
      <div className="fw-bold fs-6 fs-md-5 px-3 py-1 rounded-pill shadow-sm d-flex align-items-center flex-shrink-0" style={{ backgroundColor: 'var(--color-surface)' }}>
        <Form.Control
          type="text"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={() => {
            let p = parseInt(pageInput, 10);
            if (isNaN(p) || p < 1) p = 1;
            if (p > totalPages) p = totalPages;
            setPageInput(String(p));
            setPage(p - 1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.target.blur();
            }
          }}
          className="text-center fw-bold text-primary fs-6 fs-md-5 border-0"
          style={{ 
            backgroundColor: 'transparent',
            color: 'var(--color-primary)',
            width: `${Math.max(String(totalPages).length, String(pageInput).length, 2)}ch`, 
            padding: 0, 
            boxShadow: 'none',
            outline: 'none'
          }}
        />
        <span className="text-muted fs-6 fs-md-5 mx-1">/</span>
        <span className="text-primary fs-6 fs-md-5">{totalPages}</span>
      </div>

      <Button
        variant={page + 1 >= totalPages ? "outline-secondary" : "outline-primary"}
        disabled={page === totalPages - 1}
        onClick={() => {
          const newPage = page + 1;
          setPage(newPage);
          setPageInput(String(newPage + 1));
        }}
        className="fw-bold px-3 py-1.5 px-md-4 py-md-2 rounded-pill shadow-sm text-nowrap d-inline-flex align-items-center justify-content-center"
        style={{ flexShrink: 0 }}
      >
        다음 &raquo;
      </Button>
    </div>
  );
};

export default PaginationBar;
