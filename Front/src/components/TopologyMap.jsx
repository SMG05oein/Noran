import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { RiGlobalLine, RiServerLine, RiDatabase2Line, RiArrowRightLine } from 'react-icons/ri';

const TopologyMap = ({ sysInfo }) => {
  const isUp = (status) => String(status).toUpperCase() === 'UP';
  const dbStatus = sysInfo?.health?.db?.status;
  const dbUp = dbStatus ? isUp(dbStatus) : false;

  return (
    <Card className="shadow-sm border-0 rounded-4" style={{ backgroundColor: '#2b2b40', color: '#fff' }}>
      <Card.Header className="fw-bold" style={{ backgroundColor: '#1e1e2d', color: '#00d2ff', borderBottom: '1px solid #3f3f5a' }}>
        시스템 토폴로지 (Dependency Map)
      </Card.Header>
      <Card.Body className="d-flex justify-content-center align-items-center py-4">
        <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-4 text-center">
          
          {/* Client / Frontend */}
          <div className="d-flex flex-column align-items-center" style={{ animation: 'fadeIn 1s' }}>
            <div 
              style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#1e1e2d', border: '3px solid #00d2ff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              className="shadow mb-2"
            >
              <RiGlobalLine size={40} color="#00d2ff" />
            </div>
            <span className="fw-semibold">Frontend</span>
            <span className="small text-secondary">React / Vite</span>
          </div>

          <RiArrowRightLine size={30} color="#adb5bd" className="d-none d-md-block opacity-50" />

          {/* Backend Server */}
          <div className="d-flex flex-column align-items-center" style={{ animation: 'fadeIn 1s 0.2s both' }}>
            <div 
              style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#1e1e2d', border: '3px solid #198754', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
              className="shadow mb-2"
            >
              <RiServerLine size={40} color="#198754" />
              <span className="position-absolute top-0 start-100 translate-middle p-2 bg-success border border-dark rounded-circle">
                <span className="visually-hidden">Running</span>
              </span>
            </div>
            <span className="fw-semibold">Backend API</span>
            <span className="small text-secondary">Spring Boot</span>
          </div>

          <RiArrowRightLine size={30} color="#adb5bd" className="d-none d-md-block opacity-50" />

          {/* Database */}
          <div className="d-flex flex-column align-items-center" style={{ animation: 'fadeIn 1s 0.4s both' }}>
            <div 
              style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#1e1e2d', border: `3px solid ${dbUp ? '#0d6efd' : '#dc3545'}`, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
              className="shadow mb-2"
            >
              <RiDatabase2Line size={40} color={dbUp ? '#0d6efd' : '#dc3545'} />
              <span className={`position-absolute top-0 start-100 translate-middle p-2 bg-${dbUp ? 'primary' : 'danger'} border border-dark rounded-circle`}></span>
            </div>
            <span className="fw-semibold">MySQL DB</span>
            <span className="small text-secondary">{dbUp ? 'Connected' : 'Error'}</span>
            {sysInfo?.health?.db?.latencyMs && (
              <Badge bg="secondary" className="mt-1">{sysInfo.health.db.latencyMs}ms</Badge>
            )}
          </div>

        </div>
      </Card.Body>
    </Card>
  );
};

export default TopologyMap;
