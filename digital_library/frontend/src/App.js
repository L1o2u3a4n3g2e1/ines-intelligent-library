import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SearchBooks from './pages/SearchBooks';
import UploadBook from './pages/UploadBook';
import ReadBook from './pages/Reader';
import Profile from './pages/Profile';
import Bookmarks from './pages/Bookmarks';
import AdminDashboard from './pages/AdminDashboard';

import './styles/globals.css';

const ProtectedRoute = ({ children }) => {
  const { user } = useApp();
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user } = useApp();
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

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
