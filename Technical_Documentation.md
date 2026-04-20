# Technical System Documentation: Preschool Management System

## 1. Executive Summary
The Preschool Management System is a state-of-the-art, multi-platform ecosystem engineered to digitize and optimize the daily operations of modern preschools. By integrating administrative management, parent communication, and automated tracking, the system reduces manual labor and enhances data transparency. This document serves as a comprehensive technical guide, detailing the architectural choices, core logic, and implementation strategies for 16 pivotal features.

---

## 2. System Architecture & Methodology

### 2.1 The "Trifecta" Approach
The system is architected as a decoupled ecosystem:
1.  **Central Authority (Backend API)**: A Node.js/Express server that acts as the single source of truth. It manages the database (MySQL via Prisma), handles file storage, and orchestrates scheduled tasks.
2.  **Management Layer (Admin Web)**: A React-based single-page application (SPA) built for efficiency and data-heavy operations. It uses a component-based architecture powered by Ant Design.
3.  **Client Layer (Mobile Apps)**: Two Expo-based mobile applications (Parent App & Scanner App) designed for mobile-first interaction, utilizing native device capabilities like camera for QR scanning and push notifications for real-time updates.

### 2.2 Security & Data Integrity
*   **Authentication**: Implemented via JSON Web Tokens (JWT) with secure HTTP-only cookies or Bearer tokens.
*   **Authorization**: Granular Role-Based Access Control (RBAC) ensures that only authorized personnel can access specific modules (e.g., only Cashiers/Admins can access Billing).
*   **Data Validation**: Powered by **Zod** and Prisma's schema constraints to ensure no corrupt data enters the system.

---

## 3. Technology Stack: Deep Dive into Libraries

### 3.1 Backend: The Engine
| Library | Technical Justification |
| :--- | :--- |
| **Prisma ORM** | Used for its type-safety and auto-migration capabilities. It simplifies complex joins and ensures schema consistency across development and production. |
| **Node-Cron** | Critical for "Auto Attendance." It allows for server-side scheduling without external services. |
| **PDFKit** | Selected for its precision in generating pixel-perfect invoices and reports, allowing for custom layouts and embedded images (logos). |
| **QRCode** | A robust library for converting text data into scan-ready matrix codes, used for student identity verification. |
| **Axios** | The standard for HTTP requests, used here to communicate with the Expo Push server. |
| **Dayjs** | A lightweight alternative to Moment.js, essential for the complex date logic required in preschool settings (academic years, terms, billing months). |
| **BcryptJS** | Industry-standard password hashing with adjustable salt rounds for future-proof security. |

### 3.2 Frontend & Mobile: The Interface
| Library | Technical Justification |
| :--- | :--- |
| **Ant Design** | Provides a rich set of pre-built, accessible components that accelerate UI development while maintaining a "Pro" look and feel. |
| **Recharts** | A composable charting library that transforms raw attendance and financial data into interactive, visual insights for administrators. |
| **Expo SDK** | Streamlines mobile development by providing a unified API for native features like Push Notifications, Camera, and Secure Storage. |
| **Lucide-React** | A beautiful, consistent icon set that enhances the visual hierarchy of the applications. |

---

## 4. Feature Implementation & Logic Analysis (16 Core Modules)

### 4.1 Light Mode / Dark Mode Architecture
**The Challenge**: Maintaining visual consistency across hundreds of components when switching themes.
**The Logic**: 
1.  A `ThemeContext` is initialized at the root of the application.
2.  It reads the initial state from `localStorage` (key: `theme`).
3.  When toggled, it updates both the React state and `localStorage`.
4.  Ant Design's `ConfigProvider` receives the `isDarkMode` flag and applies a theme object containing color tokens (e.g., `colorBgContainer`, `colorText`).
*   **Frontend Logic**: `admin-web/src/context/ThemeContext.jsx`
*   **UI Application**: `admin-web/src/App.jsx:L49-120`

### 4.2 Multi-Criteria Filtering Logic
**The Challenge**: Searching through thousands of students efficiently without constant API hits.
**The Logic**:
1.  The system performs an initial "fetch-all" of active records.
2.  A `useEffect` hook monitors the `searchText`, `classroomFilter`, and `statusFilter` states.
3.  A memoized filtering function iterates through the data array, using `.toLowerCase().includes()` for text matching and strict equality for ID matching.
4.  The result is passed to the Table component for rendering.
*   **Logic Implementation**: `admin-web/src/pages/Students/index.jsx:L224-229`

### 4.3 Real-Time Age Calculation
**The Logic**: To ensure accuracy to the day, age is calculated by comparing the stored `dateOfBirth` with `dayjs()`. The system uses the "diff" function with the 'year' parameter. This ensures that a student's age updates automatically on their birthday without manual intervention.
*   **Code Location**: `admin-web/src/pages/Students/index.jsx:L248`

### 4.4 Financial Dashboard & Aggregation
**The Logic**: The financial "Payment Count" and "Income" tracking uses database-level aggregation for performance.
1.  **Count**: Calculated using `prisma.payment.count({ where: { status: 'APPROVED' } })`.
2.  **Sum**: Calculated using `prisma.payment.aggregate({ _sum: { amountPaid: true } })`.
3.  **MTD Logic**: Filters records where `createdAt` is greater than or equal to the first day of the current month.
*   **Controller Logic**: `backend/src/controllers/billing.controller.js:L405-518`

### 4.5 QR Code Generation Workflow
**The Logic**: 
1.  During student registration, the backend assigns a `studentUniqueId` (e.g., 'STU-2024-001').
2.  The `qrGenerator` utility takes this ID and generates a 2D matrix code.
3.  The result is returned as a Data URI string (e.g., `data:image/png;base64,...`).
4.  This string is stored in the `qrCode` column of the `student` table for instant rendering on ID cards.
*   **Utility**: `backend/src/utils/qrGenerator.js`

### 4.6 Advanced Media & File Uploads
**The Logic**:
1.  The frontend uses `multipart/form-data`.
2.  **Multer** middleware parses the stream, extracts the binary data, and assigns it a unique filename using `Date.now()`.
3.  A `storage.service.js` handles the move to the final directory (e.g., `/uploads/students/`).
4.  The relative path is returned to the controller to be saved in the database.
*   **Middleware**: `backend/src/middlewares/upload.middleware.js`
*   **Storage Logic**: `backend/src/services/storage.service.js`

### 4.7 The "Payment Lock" Mechanism
**The Logic**: Integrity of financial records is paramount.
1.  When a parent attempts to pay, the system first retrieves the billing record.
2.  If `billing.status === 'PAID'`, the API returns a `400 Bad Request` with the message "Already Paid."
3.  In the UI, the "Pay Now" button is conditionally rendered only if the status is `UNPAID` or `OVERDUE`.
*   **Backend Validation**: `backend/src/controllers/billing.controller.js:L65`

### 4.8 Secure Staff Password Generation
**The Logic**: 
1.  A character set of uppercase, lowercase, and numbers is defined.
2.  A loop runs 10 times, selecting a random character each time.
3.  The plaintext password is shown once to the administrator to share with the staff member.
4.  The password is encrypted using `bcrypt` (10 salt rounds) before being written to the `user` table.
*   **Controller**: `backend/src/controllers/staff.controller.js:L105-107`

### 4.9 Automated Attendance (The 9:30 AM Cron)
**The Logic**:
1.  The server initializes a cron schedule `30 9 * * *`.
2.  At the trigger time, it fetches all `ACTIVE` students.
3.  It then fetches all attendance records for today.
4.  Using a `Set`, it finds the "difference" between the two lists.
5.  It bulk-inserts `ABSENT` records for all students in the difference list.
*   **Service**: `backend/src/services/cron.service.js:L21-117`

### 4.10 Holiday & Special Day Logic
**The Logic**: Before the auto-attendance cron runs, it performs a "pre-flight" check.
1.  Query `prisma.special_day.findUnique({ where: { date: today } })`.
2.  If a record exists, the log prints "Skipping Auto-Absent for Holiday" and terminates the task.
3.  This prevents students from being marked absent on Poya days or school holidays.
*   **Service**: `backend/src/services/cron.service.js:L32-42`

### 4.11 Professional Invoice Generation (PDFKit)
**The Logic**:
1.  Invoked after a payment is `APPROVED`.
2.  Draws a custom coordinate-based layout on a virtual PDF canvas.
3.  Iterates through linked `billing` items to create a dynamic table.
4.  Calculates totals and adds an "Accountant" signature line.
5.  Outputs the buffer to a file in `uploads/receipts/`.
*   **Service**: `backend/src/services/invoice.service.js`

### 4.12 Event Media Gallery
**The Logic**: Events support a "Gallery" mode.
1.  The `event_media` table acts as a child to the `event` table.
2.  Teachers use the `uploadEventMedia` endpoint to send multiple files.
3.  Each file creates a new row in `event_media`.
4.  The Parent App fetches these in a grid view, allowing parents to download memories of their children.
*   **Controller**: `backend/src/controllers/event.controller.js:L313-352`

### 4.13 Analytical Report Generation (Puppeteer/PDF)
**The Logic**: Reports require complex data joining (Attendance + Progress + Student Info).
1.  The `report.service.js` gathers all required data points.
2.  An HTML template is populated with this data.
3.  A PDF generator (like PDFKit or a similar engine) converts the HTML/Canvas data into a high-resolution PDF.
4.  Reports are logged in `report_log` for auditing purposes.
*   **Controller**: `backend/src/controllers/report.controller.js`

### 4.14 Parent Profile Avatar Switching
**The Logic**: 
1.  The Parent App has a local asset map for avatars (`AVATARS.PARENT`).
2.  When a user selects a new avatar in the modal, its key (e.g., 'AVATAR_01') is sent to the backend.
3.  The backend updates the `photoUrl` column.
4.  The frontend uses a helper function `getAvatarSource` to map the key back to the local image asset.
*   **Mobile Screen**: `parent-app/src/screens/ProfileScreen.js:L203-245`

### 4.15 Push Notification Infrastructure
**The Logic**:
1.  **Subscription**: On app launch, `registerForPushNotificationsAsync` is called. It requests permission and gets a token from Expo.
2.  **Persistence**: The token is saved to the `user.pushToken` field in the database.
3.  **Dispatch**: When a notification is needed, the backend constructs an array of messages.
4.  **Delivery**: Axios sends these to `https://exp.host/--/api/v2/push/send`. Expo ensures delivery to both iOS and Android via their respective cloud services.
*   **Utility**: `backend/src/utils/push.utils.js`

### 4.16 Native Emoji Support
**The Logic**: The entire tech stack (JavaScript, MySQL, React) is built on UTF-8. 
1.  When an administrator types 📢 in the announcement title, it is sent as a string.
2.  The MySQL database stores it using the `utf8mb4` charset.
3.  The Parent App renders it using native OS fonts, providing a friendly and modern communication experience.
*   **Example Usage**: `admin-web/src/pages/Announcements/index.jsx`

---

## 5. API Patterns & Best Practices

### 5.1 RESTful Resource Routing
The API follows strict REST naming conventions:
- `GET /api/students` - List all students.
- `POST /api/students` - Create a new student.
- `PUT /api/students/:id` - Update a specific student.
- `DELETE /api/students/:id` - Remove a student.

### 5.2 Middleware Chain
Every request passes through a multi-stage validation pipeline:
1.  **Auth Middleware**: Verifies the JWT and attaches `req.user`.
2.  **RBAC Middleware**: Checks if `req.user.role` is permitted for this action.
3.  **Validation Middleware**: Uses **Zod** schemas to validate the body/query/params before reaching the controller.

---

## 6. Database Schema Overview (Prisma)
The database contains 25+ models. Critical tables include:
*   `user`: Universal account table for all roles.
*   `student`: Central student repository.
*   `billing`: Financial records.
*   `attendance`: Daily logs.
*   `notification`: History of all broadcasts and personal alerts.

---

## 7. Conclusion
The Preschool Management System is a robust, modular, and secure platform. By combining automated background tasks (Cron) with real-time communication (Push) and high-fidelity reporting (PDF), it provides a complete digital backbone for preschool operations. The use of modern libraries like Prisma and Ant Design ensures that the system is both maintainable for developers and delightful for end-users.
