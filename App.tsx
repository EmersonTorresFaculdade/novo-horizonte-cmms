import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkOrders from './pages/WorkOrders';
import NewWorkOrder from './pages/NewWorkOrder';
import WorkOrderDetails from './pages/WorkOrderDetails';
import Assets from './pages/Assets';
import Technicians from './pages/Technicians';
import Inventory from './pages/Inventory';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';

import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UsersPending from './pages/UsersPending';
import { ProfileProvider } from './contexts/ProfileContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { SettingsProvider } from './contexts/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <SettingsProvider>
          <ProfileProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Protected Routes */}
                <Route element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/work-orders" element={<WorkOrders />} />
                  <Route path="/work-orders/new" element={<NewWorkOrder />} />
                  <Route path="/work-orders/:id" element={<WorkOrderDetails />} />
                  <Route path="/work-orders/:id/edit" element={<WorkOrderDetails />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/calendar" element={<Calendar />} />

                  {/* Admin Only Routes */}
                  <Route path="/assets" element={
                    <ProtectedRoute requiredRoles={['admin', 'admin_root']}>
                      <Assets />
                    </ProtectedRoute>
                  } />
                  <Route path="/technicians" element={
                    <ProtectedRoute requiredRoles={['admin', 'admin_root']}>
                      <Technicians />
                    </ProtectedRoute>
                  } />
                  <Route path="/inventory" element={
                    <ProtectedRoute requiredRoles={['admin', 'admin_root']}>
                      <Inventory />
                    </ProtectedRoute>
                  } />

                  <Route path="/reports" element={
                    <ProtectedRoute requiredRoles={['admin', 'admin_root']}>
                      <Reports />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute requiredRoles={['admin', 'admin_root']}>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="/users/pending" element={
                    <ProtectedRoute requiredRoles={['admin', 'admin_root']}>
                      <UsersPending />
                    </ProtectedRoute>
                  } />
                  <Route path="/users/pending/:id" element={
                    <ProtectedRoute requiredRoles={['admin', 'admin_root']}>
                      <UsersPending />
                    </ProtectedRoute>
                  } />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Router>
          </ProfileProvider>
        </SettingsProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
};

export default App;