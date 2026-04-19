import React from 'react';
import { ConfigProvider, theme } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
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
import SpecialDays from './pages/SpecialDays';
import Logs from './pages/Logs';
import Profile from './pages/Profile';

const InitialRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'CASHIER') {
    return <Navigate to="/billing/overview" replace />;
  }


  return <Navigate to="/dashboard" replace />;
};

const AppContent = () => {
  const { isDarkMode } = useTheme();
  const { defaultAlgorithm, darkAlgorithm } = theme;

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#7B57E4',
          borderRadius: 12,
          fontFamily: "'Inter', sans-serif",
          // Deep Dark Theme Tokens
          ...(isDarkMode ? {
            colorBgLayout: '#020617', // Deeper Slate 950
            colorBgContainer: '#0f172a', // Slate 900
            colorBgElevated: '#1e293b', // Slate 800
            colorBorder: 'rgba(255, 255, 255, 0.06)', // Subtle translucent border
            colorBorderSecondary: 'rgba(255, 255, 255, 0.04)',
            colorText: '#f1f5f9', // Slate 100
            colorTextSecondary: '#94a3b8', // Slate 400
            colorTextDescription: '#64748b', // Slate 500
            colorFillSecondary: 'rgba(123, 87, 228, 0.1)', // Subtle purple fill
            controlItemBgActive: 'rgba(123, 87, 228, 0.15)',
          } : {})
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 40,
            defaultBorderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#d9d9d9',
            paddingInline: 16,
          },
          Card: {
            colorBgContainer: isDarkMode ? '#0f172a' : '#ffffff',
            colorBorderSecondary: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#f0f0f0',
            borderRadiusLG: 16,
          },
          Table: {
            colorBgContainer: isDarkMode ? 'transparent' : '#ffffff',
            headerBg: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#fafafa',
            rowHoverBg: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#fafafa',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f0f0f0',
            headerColor: isDarkMode ? '#94a3b8' : 'rgba(0, 0, 0, 0.85)',
          },
          Tag: {
            borderRadius: 6,
            colorBorder: 'transparent',
          },
          Menu: {
            itemSelectedBg: isDarkMode ? 'rgba(123, 87, 228, 0.15)' : '#F3EFFF',
            itemSelectedColor: '#7B57E4',
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            activeBarBorderWidth: 0,
          },
          Modal: {
            contentBg: isDarkMode ? '#0f172a' : '#ffffff',
            headerBg: isDarkMode ? '#0f172a' : '#ffffff',
          },
          Input: {
            colorBgContainer: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : '#ffffff',
            colorBorder: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#d9d9d9',
            activeBorderColor: '#7B57E4',
          },
          Select: {
            colorBgContainer: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : '#ffffff',
            colorBorder: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#d9d9d9',
            optionSelectedBg: isDarkMode ? 'rgba(123, 87, 228, 0.15)' : '#e6f7ff',
          }
        }
      }}
    >
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'CASHIER']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard & Common */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/announcements" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <Announcements />
              </ProtectedRoute>
            } />
            <Route path="/meetings" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <MeetingRequests />
              </ProtectedRoute>
            } />
            <Route path="/homework" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <Homework />
              </ProtectedRoute>
            } />

            {/* Classrooms */}
            <Route path="/classrooms" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <Classrooms />
              </ProtectedRoute>
            } />
            <Route path="/classrooms/:id" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <ClassroomView />
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <Attendance />
              </ProtectedRoute>
            } />
            <Route path="/special-days" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <SpecialDays />
              </ProtectedRoute>
            } />

            {/* Students & Parents */}
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentProfile />} />
            <Route path="/parents" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <Parents />
              </ProtectedRoute>
            } />
            <Route path="/parents/:id" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <ParentProfile />
              </ProtectedRoute>
            } />

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

            {/* BILLING - ADMIN, SUPER ADMIN, CASHIER */}
            <Route path="/billing/overview" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CASHIER']}>
                <BillingOverview />
              </ProtectedRoute>
            } />
            <Route path="/billing/students" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CASHIER']}>
                <StudentBilling />
              </ProtectedRoute>
            } />
            <Route path="/billing/expenses" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CASHIER']}>
                <Expenses />
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']}>
                <Events />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'STAFF']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/logs" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <Logs />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="/" element={<InitialRedirect />} />
        </Routes>
      </AuthProvider>
    </ConfigProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
