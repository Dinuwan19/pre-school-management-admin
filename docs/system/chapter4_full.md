# CHAPTER 4: SYSTEM IMPLEMENTATION AND TESTING

---

## 4.1 Technologies and Tools Used to Design, Develop, and Implement the System

The Preschool Management System (PMS) was developed as a multi-platform, full-stack solution comprising four core components: an **Admin Web Dashboard**, a **Parent Mobile Application**, a **Staff Mobile Scanner Application**, and a **Backend REST API Server**. Each component targets a distinct user group and operates on a carefully selected technology stack to ensure performance, scalability, and maintainability. The following sections describe the technologies and rationale behind each choice.

The system was designed following a **client-server architecture** where a centralized Node.js backend serves as the single source of truth. All four applications communicate exclusively through HTTPS REST API endpoints, ensuring a clean separation of concerns and making future scalability straightforward. The database is hosted on a cloud-managed MySQL instance, accessed via the Prisma ORM for type-safe, schema-driven data access.

The development environment was based on **Windows 11 with Visual Studio Code** as the primary IDE. **Git** was used for version control throughout the project lifecycle. All production deployments are hosted on a **DigitalOcean Droplet** running Ubuntu Server, managed via **PM2** (Process Manager) and **Nginx** as a reverse proxy. The live production URL is: `https://malkakulufuturemind.me`.

---

## 4.2 Programming Languages and Development Tools

### 4.2.1 Backend — Node.js with Express.js

The backend API is built using **Node.js (v20 LTS)** and the **Express.js** framework. Node.js was selected for its non-blocking I/O model, which handles concurrent parent and teacher requests efficiently. Express.js provides a lightweight and flexible middleware pipeline for routing, authentication, and error handling.

**Key backend dependencies:**

| Library | Version | Purpose |
| :--- | :--- | :--- |
| `express` | ^4.18 | HTTP server and routing framework |
| `@prisma/client` | ^5.x | Type-safe ORM for MySQL database |
| `jsonwebtoken` | ^9.x | JWT generation and verification |
| `bcryptjs` | ^2.x | Secure password hashing |
| `zod` | ^3.x | Runtime schema validation |
| `node-cron` | ^3.x | Task scheduling for automations |
| `nodemailer` | ^6.x | SMTP-based email delivery (via Brevo) |
| `multer` | ^1.x | Multipart file upload handling |
| `@supabase/supabase-js` | ^2.x | Cloud media storage for files/images |
| `puppeteer` | ^21.x | Headless browser for PDF generation |
| `dayjs` | ^1.x | Lightweight date/time manipulation |
| `qrcode` | ^1.x | QR code buffer generation for students |

The backend is structured in a layered **MVC architecture** (`controllers/`, `routes/`, `middleware/`, `services/`, `utils/`), ensuring that each module has a single responsibility.

### 4.2.2 Admin Web — React 19 with Vite

The Admin Dashboard is a **Single Page Application (SPA)** built using **React 19** and bundled with **Vite**. React was chosen for its component-based architecture and rich ecosystem. Vite was preferred over Create React App for its significantly faster Hot Module Replacement (HMR) during development.

**Key Admin Web dependencies:**

| Library | Version | Purpose |
| :--- | :--- | :--- |
| `react` | ^19 | Core UI rendering library |
| `react-router-dom` | ^6.x | Client-side routing |
| `antd` (Ant Design) | ^5.x | Enterprise-grade UI component library |
| `axios` | ^1.x | HTTP client with centralized interceptors |
| `recharts` | ^2.x | Data visualization and charting |
| `dayjs` | ^1.x | Date utilities in the UI |
| `zustand` | ^4.x | Lightweight global state management |

### 4.2.3 Parent Mobile App — React Native with Expo

The Parent App was developed using **React Native** via the **Expo** managed workflow. Expo was selected because it provides a streamlined build pipeline including EAS Build for generating production APKs without requiring a local Android SDK setup. The app is distributed as an APK file for Android devices.

**Key Parent App dependencies:**

| Library | Version | Purpose |
| :--- | :--- | :--- |
| `expo` | ~51.x | Managed workflow and native modules |
| `expo-secure-store` | ~13.x | Encrypted local token storage |
| `expo-notifications` | ~0.28 | Push notification reception |
| `expo-image-picker` | ~15.x | Camera/gallery access for payment slips |
| `expo-linear-gradient` | ~13.x | Gradient UI elements |
| `@react-navigation/native` | ^6.x | Screen navigation management |
| `lucide-react-native` | ^0.x | Icon library |
| `dayjs` | ^1.x | Date formatting |
| `axios` | ^1.x | API communication |

### 4.2.4 Staff Mobile App — React Native with Expo (Scanner)

The Staff Scanner Application is a dedicated, lightweight mobile app built using the same **React Native/Expo** stack. Its sole purpose is QR code scanning for attendance marking, optimized for speed and ease of use by teaching staff.

**Key Staff App dependencies:**

| Library | Version | Purpose |
| :--- | :--- | :--- |
| `expo-camera` | ~15.x | Camera permissions and QR frame |
| `expo-barcode-scanner` | ~13.x | QR code interpretation engine |
| `expo-haptics` | ~13.x | Haptic feedback on scan events |
| `expo-secure-store` | ~13.x | Secure token storage |

### 4.2.5 Database — MySQL with Prisma ORM

The production database is **MySQL 8.0**, hosted as a managed service. The database schema is defined and version-controlled using **Prisma Schema Language** (`schema.prisma`). Prisma provides compile-time type safety for all queries, eliminating an entire class of runtime errors. Database migrations are applied using `npx prisma migrate deploy`.

### 4.2.6 Infrastructure and Hosting Tools

| Tool | Purpose |
| :--- | :--- |
| **DigitalOcean Droplet** | Ubuntu 22.04 LTS VPS hosting |
| **Nginx** | Reverse proxy routing `/api` to backend and `/` to admin web |
| **PM2** | Node.js process manager with auto-restart |
| **Supabase Storage** | Cloud bucket for student photos, PDFs, and event media |
| **Brevo (formerly Sendinblue)** | SMTP provider for transactional emails |
| **Firebase / Expo Push** | Push notification delivery to Android devices |

---

## 4.3 User Interface Demonstration and Data Entry Screens

The system's user interface is divided by role and platform. Each role has a deliberately restricted view of the system to enforce the principle of least privilege. The four distinct interfaces are:

1. **Admin/Super Admin** — Admin Web Dashboard (Browser)
2. **Teacher/Staff** — Staff Mobile Scanner App (Android)
3. **Parent** — Parent Mobile Application (Android)
4. **Super Admin Only** — System Logs & Audit Trail (Admin Web)

---

### 4.3.1 Authentication Screens

Authentication is the entry point for all three platforms. The system enforces **role-based portal isolation**, meaning a Parent cannot log in to the Admin Web, and conversely, an Admin cannot use the Parent App.

#### Admin Web — Login

The login screen presents a clean form requiring a Username and Password. On submission, the system verifies the role against the `intendedRole` field set by the portal.

![Figure 4.1 – Admin Web Login Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\login.png)

**Frontend Validation:** The form disables the submit button until both fields are non-empty. An inline error message appears for network failures without a page refresh.

**Backend Validation:** The API checks `user.status === 'ACTIVE'` and `user.isActive === true` before comparing the bcrypt hash. If `intendedRole` is `ADMIN` but the user's role is `PARENT`, a `403 Forbidden` response is returned immediately.

#### Admin Web — Forgot Password / OTP

The forgot password flow follows a secure three-step process: (1) Enter username/email/NIC, (2) Receive a 5-minute expiry OTP via email, (3) Set a new password.

![Figure 4.2 – Forgot Password Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\forgot_password.png)

![Figure 4.3 – OTP Entry Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\otp_receiver.png)

#### Parent App — Login and Sign In

The Parent App presents a mobile-optimized login screen. Parents created by Admin receive a temporary password via email. On first login, the system forces an immediate password change (`firstLogin: true` flag).

![Figure 4.4 – Parent App Sign In Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\sign in .jpeg)

![Figure 4.5 – Parent App Login Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\login.jpeg)

![Figure 4.6 – Parent App Forgot Password](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\forgot password.jpeg)

---

### 4.3.2 Admin Web Dashboard — Super Admin / Admin Role

#### Main Dashboard

The dashboard is the first screen after login. It displays real-time statistics: total students, staff, active classrooms, pending payments, and today's attendance rate. Visual charts powered by Recharts provide a quick financial and attendance overview.

![Figure 4.7 – Admin Web Main Dashboard](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\dashboard_admin.png)

#### Create User (Staff Account)

The Admin creates new staff accounts using a dedicated form. The system automatically generates a secure temporary password and sends it to the staff member's email via Brevo SMTP.

![Figure 4.8 – Add Username and Password for New Staff](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\add_username_password.png)

---

### 4.3.3 Student Management

This module is the core of the system. It allows Admins to enroll, view, edit, and track all students.

#### Student List

![Figure 4.9 – Student List Page](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\Student list.png)

#### Add Student

The student creation form includes comprehensive required fields. **Frontend validation** checks for empty required fields and uses date-pickers to prevent incorrect date formats. **Backend validation** enforces that the student's age is between 3 and 6 years. If the classroom is at full capacity, a `400 Bad Request` error is returned before any record is created.

![Figure 4.10 – Add New Student Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\add_student.png)

#### Edit Student

Admins and Parents have different edit permissions. Parents can only modify the emergency contact, medical info, and photo. The system enforces this at the backend level regardless of the frontend UI.

![Figure 4.11 – Edit Student Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\edit student.png)

#### Student Profile with Progress and Billing

A comprehensive student profile shows academic assessments, attendance history, and billing status all in one place.

![Figure 4.12 – Student Profile View](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\student profile_1.png)

![Figure 4.13 – Student Progress Assessment Entry](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\student progress.png)

![Figure 4.14 – Student Billing Overview](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\student billing.png)

![Figure 4.15 – Student Payment Records](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\student payment.png)

![Figure 4.16 – Overdue Payment Tracking](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\overdue payment_student.png)

![Figure 4.17 – Student Attendance Records](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\student attendence.png)

---

### 4.3.4 Classroom Management

#### Classroom List and Profile

Admins can create and manage classrooms, assign teachers (up to 3 per classroom with LEAD/ASSISTANT designation), and set the weekly meal plan as a JSON structure.

![Figure 4.18 – Classroom List](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\classroom list.png)

![Figure 4.19 – Classroom Profile View](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\classroom profile.png)

#### Add and Edit Classroom

![Figure 4.20 – Add New Classroom Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\add classroom.png)

![Figure 4.21 – Edit Classroom Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\edit classroom.png)

#### Teacher Assignment

The teacher assignment screen allows fine-grained control over which teachers are assigned to which classrooms, including setting designations.

![Figure 4.22 – Teacher Selection / Assignment](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\teacher selection.png)

---

### 4.3.5 Attendance Management

The attendance module supports two modes: **QR-scan based** (via the Staff App) and **Manual Override** (via the Admin Web).

#### Daily Attendance Grid

The daily attendance grid shows all students across classrooms. A cron job automatically marks all students as `ABSENT` at **9:30 AM Sri Lanka time** every school day, unless a `special_day` holiday has been declared for that date.

![Figure 4.23 – Daily Attendance Grid](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\attendence.png)

#### Manual Attendance Tracking

On the Admin Web, supervisors can manually update a student's status (e.g., marking a `LATE` student as `PRESENT` or vice versa).

![Figure 4.24 – Manual Attendance Override](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\manual_track attendecne.png)

---

### 4.3.6 Parent and Staff Management

#### Parent List and Profile

![Figure 4.25 – Parent List](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\parent list.png)

![Figure 4.26 – Parent Profile View](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\parent profile.png)

#### Add and Edit Parent

![Figure 4.27 – Add New Parent Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\add parent.png)

![Figure 4.28 – Edit Parent Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\edit parent.png)

#### Staff List and Profile

![Figure 4.29 – Staff List](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\staff list.png)

![Figure 4.30 – Staff Profile View](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\staff profile.png)

![Figure 4.31 – Edit Staff Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\edit staff.png)

---

### 4.3.7 Billing and Financial Management

The billing module handles monthly fee generation, ad-hoc charges, payment verification, and expense tracking.

#### Billing Overview

![Figure 4.32 – Billing Overview](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\billing overview.png)

#### Manual Billing and Ad-Hoc Charges

The Admin can create one-time or recurring billing records for any student. A specialized "Ad-Hoc" billing form allows charges like uniform fees or trip payments.

![Figure 4.33 – Manual Billing Creation](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\manual billing.png)

![Figure 4.34 – Create New Ad-Hoc Charge](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\create new add hoc.png)

#### Payment Verification Queue

When a parent uploads a bank slip via the mobile app, it appears here. The Admin reviews the receipt image and approves or rejects the payment, updating the `billing.status` from `PENDING` to `PAID`.

![Figure 4.35 – Payment Verification Queue](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\varification queu.png)

---

### 4.3.8 Events, Announcements, Homework, and Expenses

#### Event Management

Events are created by Admins and media (photos, videos) is added by teaching staff after the event occurs.

![Figure 4.37 – Event List](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\event lsit.png)

![Figure 4.38 – Event Profile with Media](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\event profile.png)

![Figure 4.39 – Create Event Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\create event.png)

#### Announcements

![Figure 4.40 – Announcements List](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\announcement.png)

![Figure 4.41 – Create Announcement](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\create announcement.png)

#### Homework and Expenses

![Figure 4.42 – Homework List](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\homework list.png)

![Figure 4.43 – Create Homework Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\create homework.png)

![Figure 4.44 – Expenses List](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\expenses list.png)

![Figure 4.45 – Create Expense Form](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\create expense.png)

---

### 4.3.9 Special Days, Meetings, and System Logs

#### Special Days (Holiday Management)

Admins declare school holidays as `special_day` records. The backend cron job checks this table every morning before running auto-attendance, preventing students from being marked absent on holidays.

![Figure 4.46 – Special Days List](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\special day .png)

![Figure 4.47 – Add Special Day / Holiday](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\add special day.png)

#### Meeting Requests

Parents can request meetings through the app, which appear in the Admin Web for approval.

![Figure 4.48 – Meeting Request Portal](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\request meeting portal.png)

#### System Logs (Super Admin Only)

The system logs page is exclusively visible to the `SUPER_ADMIN` role. It records every critical action (student creation, payment verification, attendance updates) with timestamp and the actor's user ID.

![Figure 4.49 – System Audit Logs](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\admin-web-ss\system logs .png)

---

### 4.3.10 Parent Mobile Application Screens

The Parent App is a dedicated Android application providing parents with a real-time view of their enrolled children.

#### Home Dashboard (Multi-Student)

After login, parents are presented with a card list of all enrolled children under their account. Tapping a child navigates to that child's detailed profile.

![Figure 4.50 – Parent App Home / Child Selection](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\homepage.jpeg)

![Figure 4.51 – Select Child Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\select child.jpeg)

#### Student Profile Tabs

The student profile is organized into four tabs: **Details**, **Progress**, **Attendance**, and **Meal Plan**.

![Figure 4.52 – Student Profile Page (Details Tab)](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\student profile_1.jpeg)

![Figure 4.53 – Student Progress Tab](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\progress.jpeg)

![Figure 4.54 – Attendance History Tab](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\attendence.jpeg)

![Figure 4.55 – Meal Plan Tab (Weekly Menu)](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\meal plan.jpeg)

#### Student Page and Full Profile

![Figure 4.56 – Student Page List](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\student page.jpeg)

![Figure 4.57 – Full Student Profile (Card View)](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\student profile_2.jpeg)

#### Payment Module

Parents upload bank transfer receipts directly from their phone's camera or gallery. The upload sets the billing status to `PENDING`, which then awaits Admin approval.

![Figure 4.58 – Payment Overview Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\payment side.jpeg)

![Figure 4.59 – Payment Upload Step 1](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\payment_1.jpeg)

![Figure 4.60 – Payment Upload Step 2 (Slip Upload)](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\payment_2.jpeg)

![Figure 4.61 – Other / Ad-Hoc Payments](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\other payments.jpeg)

#### Events Gallery and Announcements

![Figure 4.62 – Events Gallery (List)](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\events_1.jpeg)

![Figure 4.63 – Event Media (Photo View)](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\event_2.jpeg)

![Figure 4.64 – Announcements / Notifications Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\announcement.jpeg)

#### Parent Profile and Meeting Requests

![Figure 4.65 – Parent Profile Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\parent profile.jpeg)

![Figure 4.66 – Parent Profile (Card 2)](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\Parent profile_2.jpeg)

![Figure 4.67 – Request Meeting Screen](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\request meeting.jpeg)

---

### 4.3.11 Staff Mobile Scanner Application Screens

The Staff App is a purpose-built, single-function application for QR-code-based attendance marking.

#### Scanner Screen

When a student arrives, the teacher opens the staff app and points the camera at the student's QR code card. The app decodes the code, sends the student's ID to the backend, and the backend marks the attendance as `PRESENT`. The device vibrates (haptic feedback) on successful scan.

![Figure 4.68 – QR Code Scanner Screen (Staff App)](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\scanner.jpeg)

![Figure 4.69 – Scanner App Welcome Card](C:\Users\dinuwan\.gemini\antigravity\brain\a392c4b7-d58d-4ff3-b1cb-946c9b08a15f\parent-app-ss\scanner app.jpeg)

---

### 4.3.12 Special Implementations

#### Frontend Validation

Frontend validation in the Admin Web uses React's state management and Ant Design's Form component to provide inline, real-time error messages. Key rules enforced on the client side:
- Required field checks (name, email, classroom, parent).
- Date of birth validated using a date picker (prevents future dates).
- Password strength check: must include uppercase, lowercase, number, and a special character.
- Username prefix check: staff usernames **must** start with `MFM_`.
- Enrollment capacity alert: The classroom student count is fetched and compared before submission.

In the Parent Mobile App, payment inputs are validated with `Alert.alert` feedback before any API call is made, and image uploads are size-checked on the client before uploading to Supabase.

#### Backend Validation (Zod + Custom Logic)

All API endpoints are protected by at minimum two validation layers:

1. **Zod Schema Validation**: Incoming request bodies are validated against a Zod schema in the middleware layer before reaching the controller. This prevents malformed data from even entering the business logic.
2. **Business Logic Validation in Controllers**:
   - Student age must be between 3 and 6 years.
   - Enrollment date cannot be more than 1 month in the past or in the future.
   - Classroom capacity cannot exceed the configured limit before adding a student.
   - OTP codes have a 5-minute TTL (Time-To-Live) enforced at the database query level.

#### Encryption and Security

All sensitive data is encrypted or hashed before storage:
- **Passwords**: Hashed using `bcryptjs` with a salt round of 10. Raw passwords are never stored.
- **JWT Tokens**: All API requests are authenticated using stateless JWTs signed with a `JWT_SECRET` environment variable (256-bit key). Tokens expire after **1 day** and require re-login.
- **OTP codes**: Stored as SHA-256 hashed values (`hashToken()` utility), never as plain text.
- **Secure Storage**: The Parent App uses `expo-secure-store` to store the JWT token in the device's hardware-backed keystore on Android, preventing tokens from being read by other apps.

#### Hosting and Deployment Architecture

The production environment is a **DigitalOcean Droplet** with the following configuration:
- **Nginx** serves as a reverse proxy on port 80/443. Requests to `/api/*` are forwarded to the Node.js backend on `localhost:5000`. All other requests serve the built React Admin Web static files.
- **PM2** keeps the Node.js process alive, auto-restarts on crashes, and provides log management (`pm2 logs`).
- **HTTPS/SSL**: Managed via Let's Encrypt for the domain `malkakulufuturemind.me`.
- **Environment Variables**: All secrets (database URL, JWT secret, Supabase keys, Brevo API key) are stored in a `.env` file that is excluded from version control.

#### Error Handling

Global error handling is implemented as an Express middleware function that intercepts all uncaught errors. The middleware:
1. Logs the full stack trace to the server console.
2. Checks for Prisma-specific error codes (e.g., `P2002` for unique constraint violation, `P2025` for record not found).
3. Returns an appropriate, non-exposing HTTP status code and a user-friendly JSON message.
4. Never exposes internal error stacks to the client in production.

In both mobile applications, all API calls are wrapped in `try/catch` blocks with user-facing `Alert.alert` messages to prevent silent failures.

---

## 4.4 Quality Assurance Methods Used

To ensure the system is reliable, user-friendly, and free from critical bugs, the following QA techniques were applied throughout the development lifecycle:

### 4.4.1 Frontend and Backend Validation Testing

Every data entry form was tested with both valid and invalid inputs. For example:
- Submitting the student creation form with an age outside the 3-6 year range was confirmed to return a clear validation error both on the frontend (via before-submit checks) and from the backend (via controller logic).
- Testing empty required fields confirmed that the form cannot be submitted and an inline error message appears immediately.
- Registration with a username not starting with `MFM_` was tested to confirm the backend returns a `400 Bad Request` with the correct message.

### 4.4.2 Error Handling Verification

Deliberate error injection was used to test error handling:
- The database connection was temporarily interrupted to verify that the global error middleware returned a `500 Internal Server Error` without exposing environment variables or stack traces.
- API calls with an expired JWT token were confirmed to return `401 Unauthorized`.
- Access to restricted routes (e.g., a Parent trying to access the `/api/admin/logs` endpoint) was confirmed to return `403 Forbidden`.

### 4.4.3 Manual Data Entry Testing

All forms across the Admin Web and Parent App were manually tested using real-world test data reflecting actual student records. This included:
- Creating a student, assigning to a classroom, verifying the QR code is generated and visible.
- Uploading a bank slip from the parent app and confirming it appears in the Admin Web verification queue.
- Manually marking attendance and checking it reflects in the parent app attendance history.

### 4.4.4 Browser Compatibility Testing

The Admin Web was tested on the following browsers:
- **Google Chrome** (primary development browser) — Fully functional.
- **Microsoft Edge** (Chromium-based) — Fully functional.
- **Mozilla Firefox** — Fully functional.
- **Safari (macOS)** — Tested and confirmed compatible for Ant Design components and date pickers.

### 4.4.5 Multi-Device Mobile Testing

The Parent App was installed and tested on multiple physical Android devices with different screen sizes and Android versions (Android 11, 12, and 13). Key areas tested:
- **Layout responsiveness**: Cards and buttons scale correctly on 5-inch and 6.5-inch screens.
- **Camera permissions**: `expo-image-picker` and `expo-camera` permissions were tested on fresh installs.
- **Push notifications**: Token registration to the backend was verified by checking the `pushToken` field in the database after login.

### 4.4.6 Role-Based Access Control Testing

Multiple test accounts were created for each role (`SUPER_ADMIN`, `ADMIN`, `TEACHER`, `PARENT`) and used simultaneously to verify:
- Teachers cannot see the "Create Student" button or access admin-only API routes.
- Parents cannot log in to the Admin Web portal (returns `403 Forbidden` at backend).
- System Logs page is invisible in the navigation for all roles except `SUPER_ADMIN`.
- A parent can only see their own children's data and not other students.

---

## 4.5 Libraries Used

### 4.5.1 Backend Libraries

| Library | Justification |
| :--- | :--- |
| **Prisma** | Type-safe ORM eliminates raw SQL errors. Schema-first approach makes database changes trackable via version-controlled migration files. |
| **bcryptjs** | Industry-standard adaptive hashing. Salt rounds make brute-force attacks computationally expensive. |
| **jsonwebtoken** | Stateless auth reduces database lookups on every request. Token expiry enforces session limits. |
| **node-cron** | Handles background automation (auto-absent at 9:30 AM, push notifications at 8:00 PM) without requiring a separate job queue service. |
| **nodemailer + Brevo** | Brevo was chosen over direct Gmail SMTP because it offers reliable transactional email delivery from a DigitalOcean-hosted server (which blocks standard email ports). |
| **puppeteer** | Used to render HTML templates to PDF for billing reports and student reports, avoiding the need for a separate reporting service. |
| **multer** | Handles multipart file uploads for student photos, birth certificates, and vaccine cards before they are streamed to Supabase. |

### 4.5.2 Frontend Libraries

| Library | Justification |
| :--- | :--- |
| **Ant Design (antd)** | Provides a comprehensive, accessible component library (tables, forms, modals, pickers) that dramatically reduces custom UI development time. |
| **Recharts** | A composable charting library that renders SVG-based charts (bar, pie, line) for the Admin Dashboard's key performance indicators. |
| **axios** | Used with global interceptors to automatically attach the JWT token to every request and handle `401` responses by redirecting to the login page. |
| **zustand** | A minimal global state manager used for managing the authenticated user context across the React component tree without the boilerplate of Redux. |

### 4.5.3 Mobile Libraries

| Library | Justification |
| :--- | :--- |
| **expo-secure-store** | Provides hardware-level encryption for the JWT on Android, ensuring tokens cannot be bypassed by rooted devices. |
| **expo-notifications** | Handles the full push notification lifecycle: requesting permissions, registering the Expo push token with the backend, and displaying incoming alerts. |
| **expo-camera / expo-barcode-scanner** | Powers the QR scanning engine on the Staff App. The barcode scanner decodes QR data frames in real-time without networking delays. |
| **expo-haptics** | Provides native haptic vibration on successful QR scans, giving teachers instant tactile confirmation without needing to look at the screen. |
| **lucide-react-native** | A tree-shakable SVG icon library that keeps the app bundle size small while providing a rich, consistent set of UI icons. |

---

## 4.6 Special Parts and Logic Implementations

### 4.6.1 Automated Attendance via Cron Jobs (node-cron)

The most critical automation in the system is the **auto-absent cron job**, scheduled to fire at **09:30 AM Asia/Colombo (UTC+5:30)** every weekday. The logic is:

1. The cron job fires at 9:30 AM.
2. It queries the `special_day` table to check if today is a declared holiday.
3. If a holiday exists: the job exits early — no `ABSENT` records are created.
4. If not a holiday: it fetches all `ACTIVE` students who do not yet have an attendance record for today.
5. For each such student, it creates an `Attendance` record with `status: 'ABSENT'` using the `SUPER_ADMIN` system user ID as the actor.
6. This ensures no student is ever missed, even if a teacher forgets to manually update the grid.

A second cron job fires at **8:00 PM** and sends an Expo push notification to all parents with registered push tokens when a `special_day` is coming up the next calendar day.

### 4.6.2 QR Code Generation and Attendance Marking

When a new student is created:
1. The backend first creates the student record with a temporary `qrCode` placeholder.
2. It then generates a QR code buffer using the `qrcode` library, encoding a JSON payload of `{ id, studentUniqueId, fullName }`.
3. The buffer is uploaded directly to Supabase Cloud Storage using the `uploadLocalFile` service.
4. The returned public URL is saved back to the `student.qrCode` field.

When a teacher scans this code via the Staff App:
1. The QR payload is decoded by `expo-barcode-scanner`.
2. The app sends `{ studentId }` to `POST /api/attendance/qr-scan`.
3. The backend finds the student's existing `ABSENT` record for today and updates it to `PRESENT`, setting the `checkInTime` to the current timestamp.
4. The Staff App displays the student's name and photo in a **Welcome Card** for 3 seconds, confirming the successful scan, and triggers haptic feedback.

### 4.6.3 Role-Based Access Control (RBAC) Middleware

A custom middleware (`access.middleware.js`) is applied to all protected routes. It:
1. Decodes the JWT to extract `{ id, role }`.
2. Compares the role against the permitted roles for that endpoint.
3. For teachers, it additionally scopes all database queries using the `classroomScope` middleware, which fetches the teacher's assigned classrooms and injects them into `req.classroomScope`. This ensures a teacher can only see students in their own classrooms, even if they attempt to manipulate query parameters.

### 4.6.4 Student Unique ID and Progress Calculation

Every student is assigned a sequential, human-readable ID in the format `S0001`, `S0002`, etc. The backend generates this by:
1. Querying for the last student ordered by `studentUniqueId` descending.
2. Parsing the numeric part from the result.
3. Incrementing and zero-padding the number to 4 digits.

Student progress percentage is calculated dynamically in the controller:

```
Overall % = (Sum of all AssessmentScores) / (Number of Sub-skills × 3) × 100
```

A score of 3 represents "Well Developed," 2 is "Progressing," and 1 is "Emerging/Needs Support."

### 4.6.5 Payment Verification Workflow

The payment workflow follows a secure three-state lifecycle:
1. **UNPAID**: Initial state when a billing record is created.
2. **PENDING**: State set when a parent uploads a bank slip receipt image via the mobile app. The receipt is stored in Supabase and the URL is saved in the `payment.receiptUrl` field.
3. **PAID**: Final state set only by an Admin after manually reviewing the receipt image in the Verification Queue on the Admin Web.

This manual verification step prevents fraudulent payment claims by ensuring a human always reviews physical proof of payment before clearing a billing record.

### 4.6.6 Meal Plan as Classroom JSON

Rather than creating a separate database table, the meal plan is stored as a structured **JSON string** in the `classroom.mealPlan` field. This design decision was made because:
- The meal plan is always tied to a specific classroom, not to individual students.
- It eliminates an unnecessary JOIN query when fetching student profiles.
- The Parent App parses this JSON at render time and dynamically renders icons per meal type (Breakfast, Lunch, Snack, Dinner).

When an Admin updates the meal plan, the backend automatically creates a broadcast `notification` record targeting all parents of that specific classroom, ensuring they are informed of any menu changes.

---

*End of Chapter 4*
