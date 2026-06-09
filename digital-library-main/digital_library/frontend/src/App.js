import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import VerifyGuestPhone from './pages/VerifyGuestPhone';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import DeploymentStatus from './pages/DeploymentStatus';
import Dashboard from './pages/Dashboard';
import SearchBooks from './pages/SearchBooks';
import UploadBook from './pages/UploadBook';
import ReadBook from './pages/Reader';
import Profile from './pages/Profile';
import Bookmarks from './pages/Bookmarks';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/About';
import Services from './pages/Services';

import './styles/globals.css';

const ProtectedRoute = ({ children }) => {
  const { user, authReady } = useApp();
  if (!authReady) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, authReady } = useApp();
  if (!authReady) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<Services />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
      <Route path="/verify-phone" element={<PublicRoute><VerifyGuestPhone /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/deployment-status" element={<DeploymentStatus />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchBooks /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><UploadBook /></ProtectedRoute>} />
      <Route path="/read/:id" element={<ProtectedRoute><ReadBook /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

      {/* Aliases */}
      <Route path="/history" element={<Navigate to="/dashboard" replace />} />
      <Route path="/audio" element={<Navigate to="/search" replace />} />
      <Route path="/settings" element={<Navigate to="/profile" replace />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </Router>
  );
}
