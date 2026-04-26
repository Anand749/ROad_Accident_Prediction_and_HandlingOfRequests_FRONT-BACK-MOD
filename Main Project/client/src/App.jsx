import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import WorkerDashboard from './pages/WorkerDashboard.jsx';
import NearbyHelp from './pages/NearbyHelp.jsx';
import SOSManagement from './pages/SOSManagement.jsx';
import WorkerManagement from './pages/WorkerManagement.jsx';
import RiskPrediction from './pages/RiskPrediction.jsx';

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className="min-h-screen bg-background grid-bg"
  >
    {children}
  </motion.div>
);

const App = () => {
  const location = useLocation();

  const hideNavbar = ['/login', '/register'].includes(location.pathname);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={(
              <PageWrapper>
                <Login />
              </PageWrapper>
            )}
          />
          <Route
            path="/register"
            element={(
              <PageWrapper>
                <Register />
              </PageWrapper>
            )}
          />
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute>
                <PageWrapper>
                  <UserDashboard />
                </PageWrapper>
              </ProtectedRoute>
            )}
          />
          <Route
            path="/nearby"
            element={(
              <ProtectedRoute>
                <PageWrapper>
                  <NearbyHelp />
                </PageWrapper>
              </ProtectedRoute>
            )}
          />
          <Route
            path="/risk-prediction"
            element={(
              <ProtectedRoute>
                <PageWrapper>
                  <RiskPrediction />
                </PageWrapper>
              </ProtectedRoute>
            )}
          />
          {/* Worker routes */}
          <Route
            path="/worker"
            element={(
              <ProtectedRoute role="worker">
                <PageWrapper>
                  <WorkerDashboard />
                </PageWrapper>
              </ProtectedRoute>
            )}
          />
          {/* Admin routes */}
          <Route
            path="/admin"
            element={(
              <ProtectedRoute role="admin">
                <PageWrapper>
                  <AdminDashboard />
                </PageWrapper>
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/sos"
            element={(
              <ProtectedRoute role="admin">
                <PageWrapper>
                  <SOSManagement />
                </PageWrapper>
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/workers"
            element={(
              <ProtectedRoute role="admin">
                <PageWrapper>
                  <WorkerManagement />
                </PageWrapper>
              </ProtectedRoute>
            )}
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

export default App;
