import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useDevAuthStore from '../store/useDevAuthStore';

const DevRoute = () => {
  const isAuthenticated = useDevAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/dev/login" replace />;
  }

  return <Outlet />;
};

export default DevRoute;
