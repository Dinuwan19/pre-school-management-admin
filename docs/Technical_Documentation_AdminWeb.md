# Admin-Web Technical Documentation
> Comprehensive Guide to the Preschool Management System Frontend Architecture

---

## 1. Executive Summary & Architectural Overview

The `admin-web` module represents the "Management Layer" of the Preschool Management System. Built as a Single Page Application (SPA), it provides administrators, teachers, and staff with a robust, data-heavy interface to manage daily operations. 

### Core Technologies
- **Framework**: React 19 (via Vite)
- **UI Library**: Ant Design (v6) for enterprise-grade components.
- **Routing**: React Router DOM (v7)
- **HTTP Client**: Axios (v1.13+)
- **Date Handling**: Day.js
- **Charts**: Recharts

### Architectural Philosophy
The frontend follows a strictly decoupled, component-based architecture. It emphasizes:
1. **Context-Driven State**: Global states (Authentication, Theme) are managed via React Context rather than heavy libraries like Redux.
2. **Role-Based Access Control (RBAC)**: Deeply integrated at both the Router level (`ProtectedRoute`) and the Layout level (Dynamic Menus).
3. **Optimistic UI Updates**: Using Ant Design's robust feedback mechanisms (`message`, `notification`).

---

## 2. Comprehensive Directory Structure (`src/`)

The `src` directory is organized logically by responsibility.

### Root Level Files
- **`App.jsx`**: The core router configuration and Theme Provider wrapper. It dictates what URL maps to what page.
- **`main.jsx`**: The React DOM mounting point. It attaches the React application to the `index.html` root div.
- **`index.css` & `App.css`**: Global base styles (minimal, as Ant Design handles most styling).
- **`eslint.config.js`**: Strict linting rules to enforce code quality across the team.

### `/api` (Backend Connection)
- **`client.js`**: The central Axios configuration. It defines the `baseURL`, attaches the JWT token to outgoing requests, and intercepts 401 (Unauthorized) errors to automatically log users out.

### `/context` (Global State)
- **`AuthContext.jsx`**: Manages the `user` object and `token`. Exposes `login()` and `logout()` functions.
- **`ThemeContext.jsx`**: Manages the Light/Dark mode toggle, persisting the user's choice in `localStorage`.

### `/layouts` (Application Shell)
- **`MainLayout.jsx`**: The heavy-lifter for the UI shell. It contains the collapsible Sidebar (navigation menu), the Header (user profile, theme toggle, notifications), and the `<Outlet />` where page content is rendered.

### `/components` (Shared UI Elements)
- **`ProtectedRoute.jsx`**: A wrapper component that checks `user.role` against an `allowedRoles` array before rendering children.
- **`DarkModeToggle.jsx`**: A shared switch component interacting with `ThemeContext`.

### `/pages` (Route Views)
This is where business logic resides. Each folder typically contains an `index.jsx` (List/Table view) and sometimes detailed views (e.g., `StudentProfile.jsx`).

#### Core Page Modules:
1. **`/Dashboard`**: Overview statistics and charts.
2. **`/Students` & `/Parents`**: CRUD operations and profile views.
3. **`/Billing`**: Complex financial tables (`Overview`, `StudentBilling`, `Expenses`).
4. **`/Classrooms`**: Classroom management and teacher assignment.
5. **`/Attendance`**: Manual and system attendance overrides.
6. **`/Announcements` & `/Homework`**: Educational communication.
7. **`/Staff`**: Super Admin only module for employee management.
8. **`/Events` & `/SpecialDays`**: Calendar management.
9. **`/Reports` & `/Logs`**: Audit trails and PDF generation triggers.

---

## 3. Routing & Navigation Strategy

The routing is defined entirely in `App.jsx` using `react-router-dom`. It follows a layered security approach.

### 3.1 Initial Redirect Logic
When a user visits the root `/`, the `<InitialRedirect />` component evaluates their state:
- If `loading`: Show nothing (prevent flash of content).
- If `!user`: Redirect to `/login`.
- If `user.role === 'CASHIER'`: Force redirect to `/billing/overview` (Restricted access).
- Default: Redirect to `/dashboard`.

### 3.2 Protected Routes
Routes are wrapped in a custom `<ProtectedRoute>` component.
```jsx
<Route element={
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'CASHIER']}>
        <MainLayout />
    </ProtectedRoute>
}>
```
If a user attempts to access a URL they are not authorized for, the wrapper intercepts and redirects them.

### 3.3 Dynamic Sidebar Navigation
In `MainLayout.jsx`, the menu items array is generated dynamically based on `user.role`.
- `userRole === 'PARENT'` sees only Announcements and Homework.
- `userRole === 'CASHIER'` sees only Billing sections.
- `userRole === 'SUPER_ADMIN'` unlocks Staff and System Logs.

---

## 4. Connection to Backend (API Strategy)

The connection to the Node.js backend is centralized in `src/api/client.js`.

### 4.1 Axios Instance Initialization
```javascript
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://malkakulufuturemind.me/api',
    headers: { 'Content-Type': 'application/json' },
});
```

### 4.2 Request Interceptor (Auth Injection)
Before any request leaves the browser, this interceptor runs:
```javascript
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```
*Logic*: This guarantees that every API call is authenticated without manually attaching headers in the page components.

### 4.3 Response Interceptor (Error Handling)
```javascript
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        // Extracts message for UI consumption
        error.errorMessage = error.response?.data?.message || 'An unexpected error occurred';
        return Promise.reject(error);
    }
);
```
*Logic*: If the backend JWT token expires, the backend returns a 401. This interceptor catches it globally, clears local storage, and kicks the user back to the login screen, ensuring security.

### 4.4 Media URL Resolution
The client provides a helper `getMediaUrl(path)` to resolve relative image paths (like `/uploads/students/avatar.png`) against the current API base URL, accommodating for Nginx proxy setups.

---

## 5. Form Validation & Data Integrity

Validation is handled exclusively by **Ant Design's `<Form>` component rules**, preventing bad data from ever reaching the Axios client.

### 5.1 Required Field Validation
The most common validation pattern ensures data presence:
```jsx
<Form.Item name="title" label="Event Title" rules={[{ required: true, message: 'Please enter a title' }]}>
    <Input />
</Form.Item>
```
*Logic*: The form cannot be submitted (`onFinish` will not trigger) until this field has a value.

### 5.2 Complex/Regex Validation
Used heavily in authentication and parent creation (`Login.jsx`, `ForgotPassword.jsx`, `Parents/index.jsx`):
- **Passwords**: `rules={[{ required: true }, { min: 6, message: 'Min 6 characters' }]}`
- **NIC/Username**: Ensures proper formatting before attempting to query the database.
- **Emails/Phone**: Utilizes Antd's built-in `type: 'email'` validation.

### 5.3 Initial Values & State Sync
Forms often map to existing data for editing. 
*Logic*: `<Form initialValues={{ role: 'TEACHER' }}>` sets the default, but when editing an existing record, the `form.setFieldsValue(record)` API is called within a `useEffect` to populate the modal fields securely.

---

## 6. Crucial Unmentioned Aspects

### 6.1 Theming Engine (Deep Dark Mode)
The application utilizes a custom theme engine injected into Ant Design's `ConfigProvider` (`App.jsx`).
- It defines a primary token: `colorPrimary: '#7B57E4'` (Brand Purple).
- When `isDarkMode` is true, it aggressively overrides default Ant Design tokens with a "Deep Slate" aesthetic (e.g., `colorBgLayout: '#020617'`). This avoids the "muddy gray" typical of default dark modes, opting for a high-contrast, premium SaaS look.

### 6.2 Polling Mechanisms
In `MainLayout.jsx`, the system utilizes a `setInterval` to implement pseudo-real-time updates:
```javascript
React.useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
}, []);
```
*Logic*: This keeps the "Meeting Requests" notification badge up-to-date without the heavy infrastructure overhead of WebSockets.

### 6.3 Code Quality & Linting
The presence of multiple `lint_final.txt` and `eslint_error.json` files at the root indicates a strict linting pipeline. The project enforces React Hooks rules, unused variable checks, and strict JSX formatting via `eslint.config.js`. Developers are required to clear `npm run lint` before merging.

### 6.4 Print/PDF Handling
In pages like `StudentBilling.jsx` or `Reports.jsx`, the frontend often triggers a backend generation of a PDF, but relies on browser-native APIs (`window.open`) or programmatic anchor tag clicks (`<a href="blob:..." download>`) to handle the actual file download stream received via Axios `responseType: 'blob'`.

---

## 7. Development Guidelines

When modifying `admin-web`, adhere to these principles:
1. **Never mutate state directly**: Always use the setter from `useState`.
2. **Handle Loading States**: Every API call must wrap an `isLoading` state boolean to prevent double-submissions and provide UX feedback via `<Spin>` or `loading={true}` on Buttons.
3. **Handle Error States**: Catch Axios errors and display them using `message.error(error.errorMessage)`.
4. **Respect RBAC**: If adding a new page, ensure it is added to `App.jsx` under the correct `<ProtectedRoute>` and mapped in `MainLayout.jsx` menu items.
