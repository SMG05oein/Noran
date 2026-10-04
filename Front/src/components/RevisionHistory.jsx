import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';

const RevisionHistory = ({ histories }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev < histories.length - 1 ? prev + 1 : prev));
  };

  const currentHistory = histories[currentIndex];

  if (!currentHistory) return null;

  return (
    <div className="small text-muted border p-3 rounded bg-light position-relative" style={{ fontSize: '0.82rem' }}>
      <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
        <strong className="text-dark">
          {currentHistory.version} (시행일: {currentHistory.date})
        </strong>
        <div className="d-flex gap-1 align-items-center">
          <Button 
            variant="outline-secondary" 
            size="sm" 
            className="p-0 d-flex align-items-center justify-content-center" 
            style={{ width: '24px', height: '24px' }} 
            onClick={handlePrev} 
            disabled={currentIndex === 0}
          >
            <RiArrowLeftSLine />
          </Button>
          <span className="text-muted small mx-1 fw-bold" style={{ fontSize: '0.75rem' }}>
            {currentIndex + 1} / {histories.length}
          </span>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            className="p-0 d-flex align-items-center justify-content-center" 
            style={{ width: '24px', height: '24px' }} 
            onClick={handleNext} 
            disabled={currentIndex === histories.length - 1}
          >
            <RiArrowRightSLine />
          </Button>
        </div>
      </div>
      <div style={{ minHeight: '80px', wordBreak: 'keep-all' }}>
        {currentHistory.content}
      </div>
    </div>
  );
};

export default RevisionHistory;
