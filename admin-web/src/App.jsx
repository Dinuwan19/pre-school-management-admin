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
import Homework from './pages/Homework';
import BillingOverview from './pages/Billing/BillingOverview';
import StudentBilling from './pages/Billing/StudentBilling';
import Expenses from './pages/Billing/Expenses';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/classrooms" element={<Classrooms />} />
            <Route path="/classrooms/:id" element={<ClassroomView />} />
            <Route path="/parents" element={<Parents />} />
            <Route path="/parents/:id" element={<ParentProfile />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentProfile />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/staff/:id" element={<StaffProfile />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/homework" element={<Homework />} />
            <Route path="/billing/overview" element={<BillingOverview />} />
            <Route path="/billing/students" element={<StudentBilling />} />
            <Route path="/billing/expenses" element={<Expenses />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
