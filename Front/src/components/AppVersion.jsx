import React, { useState } from 'react';
import { APP_VERSION } from '../config/version';
import ReleaseNotesModal, { getActiveVersion } from './ReleaseNotesModal';

const AppVersion = ({ prefix = '앱 버전: ' }) => {
  const [showModal, setShowModal] = useState(false);
  const currentVersion = getActiveVersion() || APP_VERSION;

  return (
    <>
      <span 
        style={{ cursor: 'pointer', textDecoration: 'underline' }} 
        onClick={() => setShowModal(true)}
        title="클릭하여 업데이트 내역 보기"
      >
        {prefix}
        {currentVersion}
      </span>
      <ReleaseNotesModal show={showModal} onHide={() => setShowModal(false)} />
    </>
  );
};

export default AppVersion;
