# Preschool Management System: Technical Documentation
## Part 4: Staff Mobile App (1,000+ Words)

---

### 4.1 Staff App Mission & Tech Stack

The Staff Mobile App is a dedicated tool engineered for extreme efficiency. Unlike the Parent App, which focuses on information consumption, the Staff App is a high-speed utility focused on data entry—specifically **Student Attendance Tracking** via QR codes. It is built using the **Expo** framework to ensure reliable hardware access across various staff mobile devices.

#### 4.1.1 Core Technologies
*   **Expo Camera**: High-frame-rate scanner integration targeting 60FPS for instantaneous QR detection.
*   **Expo Haptics**: Providing tactile feedback to teachers upon successful or failed scans.
*   **React Native / Expo**: Ensures a lightweight, fast-loading application.
*   **Axios**: Optimized for low-latency API calls during morning check-in rushes.

---

### 4.2 The QR Scanning Architecture

The centerpiece of the Staff App is the `ScannerScreen`. This interface is designed for "one-handed operation," allowing teachers to hold a student's ID card and scan it while greeting them.

#### 4.2.1 High-Performance Scanning Loop
The scanning logic utilizes a throttled event listener to prevent "Double Scanning" (where one QR code triggers multiple API calls).
1.  **Detection**: The camera identifies a QR pattern.
2.  **Hashing**: The string is extracted (e.g., STD-2026-001).
3.  **Debounce**: The app enters a "Wait State" for 3 seconds after a successful scan to prevent re-reading the same badge.
4.  **Backend Sync**: The app sends a POST request to `/api/attendance/qr-scan`.

---

### 4.3 Real-time Check-in & Validation Logic

The app doesn't just scan; it validates. When a scan occurs, the backend performs several critical checks before returning a status:
*   **Identity Check**: Does this student exist and is their status `ACTIVE`?
*   **Classroom Check**: Is the student enrolled in a class taught by this staff member (if scope is enabled)?
*   **Time Check**: Is it a duplicate scan for today?

#### 4.3.1 Visual & Audio Feedback
To minimize teacher cognitive load, the app uses a "Color-Action" feedback loop:
*   **Green + Haptic Vibration**: Success! The student is checked in.
*   **Yellow + Double Pulse**: Warning! Student already checked in or is LATE.
*   **Red + Long Vibration**: Error! Invalid QR or Student not found.

---

### 4.4 The Welcome Screen Strategy

A unique feature of the Staff App is the **Welcome Screen Overlay**. 
1.  **Automated Greeting**: Upon a successful scan, the app displays a full-screen card with the student's name and photo.
2.  **Teacher Context**: It highlights any special notes (e.g., "Allergy Warning" or "Pick-up by Grandmother") stored in the student's profile.
3.  **Auto-Dismiss**: The screen automatically resets after 4 seconds, preparing the device for the next student in line.

---

### 4.5 Hardware Integration & Optimization

The app is designed to work in real-world preschool environments (dimly lit hallways, outdoor gates, etc.).

#### 4.5.1 Low-Light Optimization
The app includes a "Flashlight Toggle" directly on the scanning interface. It communicates with the mobile device's LED flash to illuminate ID cards in low-light conditions without leaving the app.

#### 4.5.2 Battery Awareness
Since staff members use the app during the critical check-in and check-out windows, the app is optimized for low power consumption. It suspends the camera engine when the app is in the background or when the phone screen is locked, preserving battery life for the entire school day.

---

### 4.6 Security & Device Isolation

Staff members have access to the school's most sensitive data (Student rosters). The app ensures security through:
*   **Role Lockdown**: Only users with `TEACHER`, `ADMIN`, or `STAFF` roles can log into the staff app. `PARENT` credentials will be rejected by the backend portal isolation logic.
*   **Device ID Logging**: Every check-in record includes the `deviceId` of the staff member's phone, providing a clear audit trail if errors occur.

---

### 4.7 Technical Summary of Scanning Flow (ASCII)

```text
[Teacher Login] -> [Verify Role: STAFF]
      |
      V
[Scanner Screen (Camera active)] <--- [ID Card QR]
      |
      V
[Extract studentUniqueId]
      |
      +-----> [API Call: /qr-scan]
      |             |
      |             +---> [Backend: Check Status]
      |             |
      V             V
[Feedback Loop] <--- [JSON Response: {status: 'SUCCESS'}]
      |
      +-----> [Haptic Vibration]
      +-----> [Show Welcome Card (Photo + Note)]
      +-----> [Wait 4s]
      |
      V
[Reset Scanner for Next Student]
```

---

### 4.8 QA & Testing Protocols

The Staff App undergoes a specific suite of tests to ensure reliability during the "Morning Rush" (7:30 AM - 8:15 AM):
1.  **Throughput Test**: Verifying the app can handle 10 scans in 60 seconds without lag or memory leaks.
2.  **Corner Case Testing**: Scanning damaged QR codes or codes with low contrast to adjust the scanner's sensitivity thresholds.
3.  **Offline Handling**: Ensuring the app provides a clear "No Internet" warning if the Wi-Fi or cellular data drops during a scan.
