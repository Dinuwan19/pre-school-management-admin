# Mobile Applications Documentation

The system includes two distinct mobile applications built on the **Expo (React Native)** platform to provide seamless on-the-go access for parents and school staff.

---

## 👨‍👩‍👧‍👦 Parent App 

The Parent App is designed for real-time engagement and monitoring of their children's preschool experience.

### Key Logic & Features
*   **Multi-Student Management**: A single parent login allows switching between multiple children (e.g., siblings) with instant dashboard data refresh.
*   **Payment Hub**: 
    *   **Visibility**: Detailed billing history per student.
    *   **Receipt Upload**: Allows parents to capture and upload bank transaction receipts directly via the app.
*   **Engagement**: Real-time access to Events, Homework, and Daily Attendance records.
*   **Media Gallery**: Secure viewing and downloading of photos/videos shared by the school for specific events.

### Security & Storage
*   **Secure Auth**: Authentication tokens are stored in **Expo Secure Store**, providing hardware-level encryption (Keychain on iOS, Keystore on Android).
*   **Push Notifications**: Registers unique device tokens with the backend via **Expo Notifications** to receive instant alerts for new announcements or special days.

---

## 🏫 Staff Mobile App

The Staff App is a specialized tool optimized for speed and utility within the classroom and school entrance.

### Key Logic & Features
*   **QR Scanner (Attendance)**: Uses the device camera to scan student IDs. 
    *   **Logic**: Real-time backend verification to prevent duplicate check-ins and to record precise timestamps for check-in/out.
*   **Welcome Interface**: Minimalist design focused on greeting students and parents during the morning rush.
*   **Media Capture**: Integrated camera controls to record photos and videos of classroom activities for direct upload to student event galleries.

### Performance Patterns
*   **Navigation**: Uses `@react-navigation/stack` for high-performance screen transitions on mobile hardware.
*   **AV Handling**: Utilizes `expo-av` for efficient playback and recording of classroom videos.

---

## 🧪 QA Methodology for Mobile

To ensure a reliable mobile experience, the following techniques were used:
1.  **Manual Device Testing**: Verified functionality on physical Android (APK) and iOS (Simulator/TestFlight) devices.
2.  **Network Resilience**: Testing behavior under low-bandwidth or offline conditions using `expo-network`.
3.  **Haptic Feedback**: Implementing subtle vibration cues for successful QR scans to provide non-visual confirmation to teachers.
