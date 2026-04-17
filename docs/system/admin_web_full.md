# Preschool Management System: Technical Documentation
## Part 2: Admin Web Dashboard (1,000+ Words)

---

### 2.1 Frontend Philosophy & Tech Stack

The Admin Web Dashboard is a state-of-the-art Single Page Application (SPA) built using the latest **React 19** and bundled with **Vite** for near-instantaneous development builds. The design system is strictly based on **Ant Design (AntD)**, which has been heavily customized to provide a premium, cohesive look that aligns with the preschool's branding.

#### 2.1.1 Core Technologies
*   **React 19**: Utilizing the newest concurrent rendering features and hooks for optimized performance.
*   **Axios**: Centralized HTTP client with interceptors for automatic JWT injection and error handling.
*   **Dayjs**: A lightweight alternative to Moment.js for all date and time manipulations.
*   **Recharts**: Powering the interactive financial and attendance analytics on the main dashboard.

---

### 2.2 UI Architecture and Component Design

The application follows a modular "Page-Component" architecture. Shared UI elements like buttons, cards, and avatars are wrapped in custom AntD theme tokens to ensure style consistency across the entire 15+ module suite.

#### 2.2.1 The Main Layout Blueprint
The `MainLayout.jsx` serves as the shell of the application, handling the responsive sidebar navigation and the global breadcrumb system.

**Visual Representation: Dashboard Layout**
```text
+-------------------------------------------------------------+
| [LOGO]    [Search...]                 [Role Tag] [Profile]  |
+-----------+-------------------------------------------------+
| Sidebar   |  Breadcrumbs > Current Page                     |
| --------- |-------------------------------------------------|
| Dashboard |                                                 |
| Students  |         [Main Content Area]                     |
| Staff     |         (Tables, Forms, Charts)                 |
| Attend... |                                                 |
| Billing   |                                                 |
| Events    |                                                 |
| Settings  |                                                 |
+-----------+-------------------------------------------------+
```

---

### 2.3 Authentication & Security Layer

#### 2.3.1 Role-Based Protected Routes
Security starts at the routing level. The system uses a `ProtectedRoute` component that leverages the `AuthContext` to determine if a user has the appropriate clearance for a specific URL.

**Code Insight: Protected Routing**
```javascript
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    
    if (loading) return <LoadingSpinner />;
    if (!user) return <Navigate to="/login" />;
    
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" />;
    }
    
    return children;
};
```

#### 2.3.2 Portal Isolation Logic
To prevent account-swapping vulnerabilities, the frontend checks the `intendedRole` during login. Even if a user knows an Admin URL, the backend JWT validation combined with the frontend's Context-level role check will trigger an immediate redirect to the correct portal.

---

### 2.4 Deep Dive: Attendance Management Module

The Attendance module is arguably the most sophisticated part of the Admin web. It supports real-time monitoring, bulk actions, and manual overrides.

#### 2.4.1 The Daily Attendance Grid
Administrators can view a live table of students, filtered by classroom. Each row reflects the student's status:
*   **PRESENT**: Marked via QR scan or manual teacher action.
*   **LATE**: Automatically triggered if a check-in occurs after 8:30 AM (Asia/Colombo).
*   **ABSENT**: Marked by the 9:30 AM system cron job.

#### 2.4.2 Manual Override & Audit Logic
When an admin manually changes a status (e.g., student forgot their ID card), the system opens a Modal that requires a "Reason for Override." This data is sent to the `/api/attendance/manual` endpoint and stored in the `attendanceaudit` table for future verification.

---

### 2.5 Multi-Module Feature Set

#### 2.5.1 Billing & Expense Management
This module provides a dual-view system:
1.  **Student Billing**: Generates recurring monthly invoices or one-time fee records. It includes a "Payment Proof Viewer" where admins can zoom into bank slip photos uploaded by parents.
2.  **Expense Tracking**: Tracks school overheads, allowing admins to upload expense receipts to Supabase for book-keeping.

#### 2.5.2 Student & Staff Management
*   **Enrollment Flow**: A multi-step form that captures student bio-data, parent contact links, and document uploads. Upon completion, it triggers the generation of a unique QR code.
*   **Staff Profiles**: Restricts access so that teachers can only see classrooms they are assigned to, while Super Admins maintain a "God-eye" view of all staff activity.

#### 2.5.3 Events & Announcements
*   **Push Notification Integration**: When an Admin creates an event, the frontend provides a toggle to "Send Push Notification." If enabled, the backend broadcasts to all relevant parent devices in real-time.
*   **Media Gallery**: Admins can upload multiple photos/videos to an event. These are rendered in a sleek, responsive gallery using AntD's `Image.PreviewGroup`.

---

### 2.6 Form Validation & Data Integrity

The system uses **Zod-style client-side validation** combined with Ant Design's `Form` component rules to ensure no "dirty" data ever reaches the backend.

**Common Validation Rules:**
*   **Phone Numbers**: Regex-validated for Sri Lankan phone formats.
*   **Passwords**: Minimum 8 characters with at least one uppercase letter and one number for Staff/Admins.
*   **Dates**: Prevents selecting future dates for attendance or past dates for upcoming events.

---

### 2.7 Performance & Optimization

To maintain a fluid 60FPS user experience, the Admin Web employs several optimization techniques:
1.  **Lazy Loading**: Modules like Billing and Reports are only loaded when the user navigates to them, reducing the initial bundle size.
2.  **Debounced Search**: Student search bars use a 300ms debounce to prevent excessive API calls while the user is typing.
3.  **Memoization**: Heavy data tables use `React.memo` and `useMemo` to prevent redundant re-renders when unrelated state changes occur.
