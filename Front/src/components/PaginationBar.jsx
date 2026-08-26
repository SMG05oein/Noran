import React from 'react';
import { Button, Form } from 'react-bootstrap';

const PaginationBar = ({ page, totalPages, pageInput, setPage, setPageInput }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="d-flex justify-content-center align-items-center mt-4 gap-3">
      <Button
        variant={page === 0 ? "outline-secondary" : "outline-primary"}
        disabled={page === 0}
        onClick={() => {
          const newPage = page - 1;
          setPage(newPage);
          setPageInput(String(newPage + 1));
        }}
        className="fw-bold px-4 py-2 rounded-pill shadow-sm"
      >
        &laquo; 이전
      </Button>
      
      <div className="fw-bold fs-5 text-dark bg-light px-3 py-1 rounded-pill shadow-sm d-flex align-items-center">
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
          className="text-center fw-bold text-primary fs-5 border-0 bg-transparent"
          style={{ width: `${Math.max(String(totalPages).length, String(pageInput).length, 2)}ch`, padding: 0, boxShadow: 'none', outline: 'none' }}
        />
        <span className="text-muted fs-5 mx-1">/</span> 
        <span className="text-primary fs-5">{totalPages}</span>
      </div>

      <Button
        variant={page + 1 >= totalPages ? "outline-secondary" : "outline-primary"}
        disabled={page === totalPages - 1}
        onClick={() => {
          const newPage = page + 1;
          setPage(newPage);
          setPageInput(String(newPage + 1));
        }}
        className="fw-bold px-4 py-2 rounded-pill shadow-sm"
      >
        다음 &raquo;
      </Button>
    </div>
  );
};

export default PaginationBar;
