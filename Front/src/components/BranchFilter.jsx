import React, { useState, useEffect } from 'react';
import { ButtonGroup, ToggleButton } from 'react-bootstrap';
import { fetchWorkPlaces } from '../api/authApi';

const BranchFilter = ({ selectedBranch, onChange }) => {
  const [branches, setBranches] = useState([{ wpIdx: '', wpName: '전체' }]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const branchRes = await fetchWorkPlaces();
        if (branchRes.success) {
          setBranches([{ wpIdx: '', wpName: '전체' }, ...branchRes.data]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadBranches();
  }, []);

  return (
    <ButtonGroup className="shadow-sm">
      {branches.map((b, idx) => {
        const val = b.wpIdx !== null && b.wpIdx !== undefined ? String(b.wpIdx) : '';
        return (
          <ToggleButton
            key={idx}
            id={`branch-filter-${idx}`}
            type="radio"
            variant={selectedBranch === val ? "primary" : "outline-primary"}
            name="branchFilterRadio"
            value={val}
            checked={selectedBranch === val}
            onChange={(e) => onChange(e.currentTarget.value)}
            className="px-3 fw-bold"
          >
            {b.wpName}
          </ToggleButton>
        );
      })}
    </ButtonGroup>
  );
};

export default BranchFilter;
