# Preschool Management System: Technical Documentation
## Part 3: Parent Mobile App (1,000+ Words)

---

### 3.1 Mobile Philosophy & Tech Stack

The Parent App is a cross-platform mobile application developed using **React Native** and the **Expo** framework. It is designed to provide parents with a seamless, real-time window into their child's daily life at the preschool. By leveraging a single codebase for both iOS and Android, the system ensures feature parity and rapid update cycles.

#### 3.1.1 Core Technologies
*   **React Native / Expo**: enabling high-performance UI components that feel natively fluid.
*   **React Navigation**: Utilizing a deep stack and tab navigation system for intuitive discovery.
*   **Expo Secure Store**: For high-security storage of JWT tokens and user credentials.
*   **Lucide-React-Native**: A consistent, lightweight icon set used throughout the interface.

---

### 3.2 User Experience & Dashboard Architecture

The dashboard is the central hub of the parent experience. It employs a "Child-First" design philosophy, where all data (Attendance, Payments, Events) is contextually filtered based on the currently selected child.

#### 3.2.1 Multi-Student Logic
For parents with multiple children enrolled in the same preschool, the app implements a sophisticated switching mechanism.
*   **Global Selection**: A selection modal allows parents to toggle between children. 
*   **Contextual Filtering**: Upon switching, the app clears the previous child's state and re-queries the backend for the specific stats of the newly selected child.
*   **Implementation Flow**:
    ```text
    [Select Child] -> [Update Global State] -> [Trigger Fetch Stats(childId)] -> [Re-render Dashboard]
    ```

---

### 3.3 The Push Notification Engine

The app utilizes **Expo Notifications** and **Firebase Cloud Messaging (FCM)** to bridge the gap between school and home.

#### 3.3.1 Token Lifecycle Management
1.  **Permission Request**: On the first launch, the app explicitly requests notification permissions.
2.  **Token Registration**: It generates a unique `ExponentPushToken`.
3.  **Backend Sync**: This token is sent to the `/api/parent-auth/push-token` endpoint and linked to the user's account in the `user` table.

#### 3.3.2 Real-time Broadcasts
When an Admin triggers a notification (e.g., "Special Day Tomorrow"), the backend sends a request to the Expo Push Service. The mobile app can handle these notifications in three states:
*   **Foreground**: A custom in-app dropdown alert is shown.
*   **Background**: A standard iOS/Android notification appears.
*   **Killed**: Tapping the notification launches the app and deep-links directly to the relevant update or event.

---

### 3.4 Feature Set Walkthrough

#### 3.4.1 Attendance Monitoring
Parents can view a monthly calendar where each day is color-coded:
*   **Green**: Present (Check-in time displayed).
*   **Red**: Absent (marked by system or parent).
*   **Yellow**: Late (Check-in after 8:30 AM).
This transparency helps parents verify their child's safety and reliability.

#### 3.4.2 The Billing & Payment Workflow
This is a critical module that simplifies school fee management.
1.  **Invoicing**: Parents see a list of "Unpaid" or "Pending" bills.
2.  **Payment Upload**: Instead of manual handovers, parents can take a photo of their bank deposit slip directly within the app.
3.  **Verification Loop**: The backend receives the image (stored on Supabase) and updates the status to `PENDING`. Once the school office verifies the bank entry, the parent receives a push notification and the bill moves to `PAID`.

#### 3.4.3 Events & Media Gallery
The events section is designed to be a "digital memory book."
*   **Event Details**: Displays titles, descriptions, and maps (if applicable).
*   **Media Gallery**: Parents can scroll through high-definition photos and videos of their children.
*   **Download Logic**: The app implements `Expo Media Library` and `Expo File System` to allow parents to save these photos to their local phone gallery.

---

### 3.5 Security & Data Integrity

#### 3.5.1 Authentication Loop
The app uses a 24-hour token refresh cycle. If the token expires while the app is in the background, the `axios` interceptor catches the 401/403 error and automatically redirects the parent back to the Login screen, ensuring no unauthorized access to sensitive child data.

#### 3.5.2 Data Synchronization Strategy
To minimize data usage, the app uses **Conditional Fetching**. It only re-fetches the full dashboard stats if the user has switched children or if the `useFocusEffect` (powered by React Navigation) detects the user has returned to the main screen after an absence of more than 5 minutes.

---

### 3.6 Error Handling & Offline Resilience

Mobile environments are notoriously unstable. The Parent App handles this through:
*   **Empty State Components**: Friendly illustrations shown when there's no data or no internet connection.
*   **Retry Logic**: Strategic "Pull-to-Refresh" functionality allows parents to manually re-sync data if a network glitch occurs.
*   **Toast Notifications**: Non-intrusive alerts (e.g., "Payment Upload Successful!") keep the user informed without breaking their flow.

---

### 3.7 Technical Summary of User Flow (ASCII Diagram)

```text
[Parent Login] 
      |
      V
[Dashboard: Selected Child A] <--- [Push Notification received]
      |                                      |
      +-----> [Payments] ----> [Upload Slip] --+
      |
      +-----> [Attendance] --> [View Calendar]
      |
      +-----> [Events] ------> [Download Photo]
      |
      V
[Switch to Child B] -----------+
      |                        |
      V                        V
[State Reset] ---------> [Re-fetch Stats(B)]
```
