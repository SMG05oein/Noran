import React, { useState, useEffect } from 'react';
import { fetchWorkPlaces } from '../api/authApi';
import { RiStore2Line } from 'react-icons/ri';

const BranchFilter = ({ selectedBranch, onChange, onlyAll = false }) => {
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

  const displayedBranches = onlyAll ? branches.filter(b => !b.wpIdx) : branches;

  return (
    <div className="branch-select-pills mb-0">
      {displayedBranches.map((b) => {
        const val = b.wpIdx !== null && b.wpIdx !== undefined ? String(b.wpIdx) : '';
        const isActive = selectedBranch === val;
        return (
          <button
            key={b.wpIdx ?? 'all'}
            type="button"
            className={`branch-pill ${isActive ? 'active' : ''}`}
            onClick={() => onChange(val)}
          >
            <RiStore2Line className="me-1" />
            {b.wpName}
          </button>
        );
      })}
    </div>
  );
};

export default BranchFilter;
