import React from 'react';
import { Spinner } from 'react-bootstrap';

const Loading = ({ text = '데이터를 불러오는 중입니다...', variant = 'primary', size }) => (
  <div
    className="d-flex flex-column align-items-center justify-content-center text-center py-5"
    role="status"
    aria-live="polite"
  >
    <Spinner animation="border" variant={variant} size={size} className="mb-3" />
    <span className="text-muted small">{text}</span>
  </div>
);

export default Loading;
