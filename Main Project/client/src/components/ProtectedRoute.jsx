import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleHome = {
  admin: '/admin',
  worker: '/worker',
  user: '/dashboard',
};

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card px-8 py-6 text-center">
          <div className="h-2 w-40 bg-gradient-to-r from-accentBlue to-accentRed animate-pulse rounded-full mb-4" />
          <p className="text-sm text-gray-300 tracking-widest uppercase">
            Verifying Secure Access
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={roleHome[user.role] || '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;
