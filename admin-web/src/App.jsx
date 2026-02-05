import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MainLayout from './layouts/MainLayout';

// Import Pages
import Classrooms from './pages/Classrooms';
import Parents from './pages/Parents';
import Students from './pages/Students';
import Staff from './pages/Staff';
import StudentProfile from './pages/Students/StudentProfile';
import ParentProfile from './pages/Parents/ParentProfile';
import ClassroomView from './pages/Classrooms/ClassroomView';
import StaffProfile from './pages/Staff/StaffProfile';
import Attendance from './pages/Attendance';
import Announcements from './pages/Announcements';
import MeetingRequests from './pages/Announcements/MeetingRequests';
import Homework from './pages/Homework';
import BillingOverview from './pages/Billing/BillingOverview';
import StudentBilling from './pages/Billing/StudentBilling';
import Expenses from './pages/Billing/Expenses';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Reports from './pages/Reports';
import Events from './pages/Events';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard & Common - Accessible by ALL staff/parents (managed by component) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/meetings" element={<MeetingRequests />} />
            <Route path="/homework" element={<Homework />} />

            {/* Classrooms - Accessible by Staff */}
            <Route path="/classrooms" element={<Classrooms />} />
            <Route path="/classrooms/:id" element={<ClassroomView />} />
            <Route path="/attendance" element={<Attendance />} />

            {/* Students & Parents - Teachers View Only, Admins Edit */}
            {/* Note: View components handle internal permission checks (e.g. hiding Edit buttons) */}
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentProfile />} />
            <Route path="/parents" element={<Parents />} />
            <Route path="/parents/:id" element={<ParentProfile />} />

            {/* STAFF - SUPER ADMIN ONLY */}
            <Route path="/staff" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <Staff />
              </ProtectedRoute>
            } />
            <Route path="/staff/:id" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <StaffProfile />
              </ProtectedRoute>
            } />

            {/* BILLING - ADMIN & SUPER ADMIN ONLY */}
            <Route path="/billing/overview" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <BillingOverview />
              </ProtectedRoute>
            } />
            <Route path="/billing/students" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <StudentBilling />
              </ProtectedRoute>
            } />
            <Route path="/billing/expenses" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <Expenses />
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER']}>
                <Events />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <Reports />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
