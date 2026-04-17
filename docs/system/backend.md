# Backend Service Documentation

The backend is a robust Node.js/Express server that serves as the single source of truth for the entire preschool management ecosystem.

## 🛠️ Core Technology Stack
*   **Engine**: Node.js (Express.js Framework)
*   **ORM**: Prisma (SQL Database Abstraction)
*   **Database**: MySQL
*   **Media Storage**: Supabase SDK (S3-compatible)
*   **Reporting**: Puppeteer & PDFKit (Automated PDF generation)
*   **Communication**: Nodemailer (SMTP integration for notifications)

---

## 🏗️ Middleware-Driven Architecture

The backend utilizes a sophisticated middleware chain to ensure security, data integrity, and consistent logging.

| Middleware | Purpose | Implementation Details |
|------------|---------|------------------------|
| **Auth** | Token Verification | Validates JWT from `Authorization` header. |
| **Access** | RBAC Enforcement | Checks user roles (`ADMIN`, `TEACHER`, etc.) and scopes teachers to their specific classrooms. |
| **Audit** | Compliance Logging | Automatically records create/update/delete actions in the `auditlog` table. |
| **Validate** | Data Integrity | Uses **Zod schemas** to validate incoming request bodies BEFORE they reach the controller. |
| **Error** | Exception Mapping | Global handler that catches Prisma and internal errors, returning clean JSON payloads. |

---

## 🛡️ Security Implementation

Security is integrated at every layer of the API:
*   **Password Hashing**: BcryptJS with a salt factor of 10.
*   **Authentication**: Stateless JWT (JSON Web Tokens) with a configurable expiration and secret key.
*   **Headers**: `helmet` middleware used to set secure HTTP headers (CSPs, X-Frame-Options, etc.).
*   **CORS**: Restricted origins configured to prevent unauthorized cross-domain requests.
*   **Input Sanitization**: Handled via Type-safe Zod schema validation.

---

## ⏳ Automations (Cron Jobs)

The system relies on scheduled tasks using `node-cron` to maintain data accuracy without manual intervention.

### 📍 Absentee Catch-up
*   **Schedule**: Runs daily at **09:30 AM (Asia/Colombo)**.
*   **Logic**: 
    1.  Checks the `special_day` table to determine if today is a holiday.
    2.  If it is a working day, identifies students who have not yet checked in.
    3.  Automatically marks them as `ABSENT` to ensure attendance reports are finalized correctly by mid-morning.
*   **Fallback**: If the server restarts after 9:30 AM, a "startup check" is triggered to run any missed jobs for the current day.

---

## 🧪 Error Handling Strategy

The system uses a centralized error handler (`errorHandler.js`) to ensure consistent API responses.

```javascript
// Example of Prisma Mapping in Middleware
if (err.code === 'P2002') {
    return res.status(400).json({
        message: `A record with this ${err.meta?.target || 'value'} already exists.`,
        error: 'Conflict'
    });
}
```

---

## 📤 Specialized Logic

*   **QR Generation**: Uses `qrcode` library to generate unique identifiers for students which are stored as Base64/Files.
*   **Meeting Requests**: Logic to prevent conflicting parent-teacher meeting slots.
*   **Storage Buffering**: Uses `multer` for memory/disk storage before uploading to the Supabase cloud bucket.
