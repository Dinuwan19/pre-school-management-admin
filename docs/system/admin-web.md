# Admin Web Dashboard Documentation

The Admin Web Dashboard is the central command center for preschool administrators, teachers, and financial staff.

## 🛠️ Core Technology Stack
*   **Engine**: React 19 (Functional Components & Hooks)
*   **Build Tool**: Vite (Ultra-fast development and bundling)
*   **UI Framework**: Ant Design (antd)
*   **Routing**: React Router Dom
*   **Charts**: Recharts (Financial and attendance visualizations)
*   **QR Scanning**: `html5-qrcode`

---

## 👥 User Roles & Permissions

The dashboard uses a Dynamic Route Guard system (`ProtectedRoute`) to show or hide functionality based on the authenticated user's role.

| Role | Access Permissions |
|------|---------------------|
| **SUPER_ADMIN** | Full system access, including System Logs and Staff management. |
| **ADMIN** | Management of Students, Parents, Classrooms, and Events. No access to system logs. |
| **TEACHER** | Attendance taking, Events, Announcements, and Homework. Restricted to assigned classrooms. |
| **CASHIER** | Billing overview, Expense entry, and Payment verification. |
| **STAFF** | General entry of Attendance and management of Student records. |

---

## 📑 Page Demonstrations & Data Entry

### 📊 Dashboard
*   **Purpose**: High-level overview of the day.
*   **Data Visuals**: Today's attendance percentage, monthly revenue charts, and upcoming event cards.

### 👥 Student & Staff Management
*   **Profile Management**: Detailed views for students including QR code display and document management.
*   **Master Lists**: Searchable, paginated tables for parents, staff, and students.

### 💰 Financial Center
*   **Student Billing**: Individual billing tracking with status updates (Paid/Pending/Unpaid).
*   **Expense Tracker**: Monthly summary of preschool expenditures by category.

---

## ✅ Special Implementations

### Frontend Validation (Ant Design Forms)
Robust validation is implemented using Ant Design's `rules` prop to ensure data quality before hitting the API.

```javascript
// Example: Student Enrollment Validation
<Form.Item
  name="fullName"
  rules={[{ required: true, message: 'Full name is required' }, { min: 3 }]}
>
  <Input placeholder="Enter student's full name" />
</Form.Item>
```

### Dynamic Theming
Supported through a centralized `ConfigProvider`:
*   **Dark Mode**: A deep-slate palette (`#020617`-`#0f172a`) optimized for reduced eye strain during long administrative sessions.
*   **Light Mode**: A clean, professional purple-themed interface.

### QR Integration
Internal scanner allows teachers to mark attendance instantly using the device camera or a professional QR scanner.

---

## 📦 State Management

*   **AuthContext**: Manages user session, JWT storage in `localStorage`, and logout logic.
*   **ThemeContext**: Persists the user's preferred theme (Dark/Light).
