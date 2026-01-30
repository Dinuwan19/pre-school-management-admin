# Enhanced Project Plan: Jan 30 Enhancements

> **Status**: APPROVED
> **Architecture**: Aligned with `ARCHITECTURE.md`
> **Protocol**: Debugger & Security First

## 1. System State Analysis (Pre-Flight Check)

Before implementation, we analyzed the current system state (`schema.prisma`):

| Component | Current State | Required Change | Gap |
|-----------|---------------|-----------------|-----|
| **Audit Log** | Table `auditlog` **EXISTS** | Enhanced logging middleware | **Low** (Use existing table) |
| **Events** | `event_status` has {UPCOMING, COMPLETED...} | Need {DRAFT, APPROVED} | **Medium** (Enum update + Logic) |
| **Events** | Missing `mediaUrl` | Add `mediaUrl` column | **Low** (Schema migration) |
| **Users** | No `avatarType` | Add `avatarType` to User/Profile | **Low** (Schema migration) |
| **Billing** | Basic Bucket Logic | Overdue/Pending Logic | **Medium** (Controller logic) |

---

## 2. Architecture & Agent Mapping

We will use the following agents as defined in `ARCHITECTURE.md`:

| Feature Area | Primary Agent | Required Skills |
|--------------|---------------|-----------------|
| **Backend Core** | `backend-specialist` | `database-design` (Prisma), `api-patterns` (REST) |
| **Admin UI** | `frontend-specialist` | `frontend-design` (Layout), `security-auditor` (Route Guards) |
| **Mobile App** | `mobile-developer` | `mobile-design` (Touch targets), `mobile-performance` |
| **Quality Control**| `debugger` | `systematic-debugging` (Verification) |

---

## 3. Implementation Phases (Debugger Protocol)

We follow the **4-Phase Process** from `debugger.md` for every feature.

###  Phase 1: Backend Architecture [BACKEND]

#### 1.1 Database Schema Enhancements
*   **File**: `backend/prisma/schema.prisma`
*   **Action**:
    *   [ ] **Modify `event` model**: Add `mediaUrl String?`.
    *   [ ] **Update `event_status`**: Add `DRAFT`, `APPROVED`.
    *   [ ] **Modify `student` / `parent`**: Add `avatarType` (enum: ADULT, CHILD).
*   **Verification**: Run `npx prisma migrate dev` and verify no data loss.

#### 1.2 Enhanced Audit Service
*   **Current**: `auditlog` exists but is manually called.
*   **New**: Create `backend/src/services/audit.service.js`.
*   **Action**:
    *   [ ] `logAction(userId, resource, action, meta)`
    *   [ ] **Middleware**: `backend/src/middlewares/auditMiddleware.js` for automatic route logging.

#### 1.3 Event Approval & Billing Logic
*   **Files**: `backend/src/controllers/event.controller.js`, `billing.controller.js`.
*   **Logic**:
    *   [ ] Events created by TEACHER -> `PENDING`.
    *   [ ] Events approved by ADMIN -> `PUBLISHED`.
    *   [ ] Billing: Calculate `Overdue` based on `billingMonth` vs Current Date.

### Phase 2: Admin Web Security & UI [FRONTEND]

#### 2.1 Security & Restrictions (Route Guards)
*   **File**: `admin-web/src/App.jsx` & Layouts.
*   **Action**:
    *   [ ] Hide "Add Student" / "Add Parent" from Sidebar for Non-Admins.
    *   [ ] **Hard Check**: Backend should reject these requests from Teachers even if UI is bypassed.

#### 2.2 Event Management UI
*   **File**: `admin-web/src/pages/Events/`
*   **Action**:
    *   [ ] Add `MediaUrl` input (Text/File).
    *   [ ] Add "Status" Badge (Yellow=Pending, Green=Published).
    *   [ ] **Admin View**: "Approve" button visible only to Super Admin.

### Phase 3: Parent App Experience [MOBILE]

#### 3.1 Dashboard & Navigation (Mobile-Design Skill)
*   **File**: `parent-app/src/navigation/AppNavigator.js`
*   **Action**:
    *   [ ] **Header**: Add "Switch Student" Avatar (Top Right).
    *   [ ] **Bottom Tab**: Add "Events" tab.
    *   [ ] **Remove**: "Quick Actions" (Reduce cognitive load).

#### 3.2 Student Profile & Payment
*   **Action**:
    *   [ ] **Attendance Card**: Visual calendar of presence.
    *   [ ] **Payment Flow**: Red/Yellow/Green status indicators.
    *   [ ] **Fix**: Prevent double-payment (Disable button if `status === PAID`).

---

## 4. Verification Plan (Post-Flight Check)

**Trigger**: After implementation, run these specific checks.

| Feature | Test Case | Success Criteria |
|---------|-----------|------------------|
| **Auditing** | Create a new Event | Row appears in `auditlog` table |
| **Permissions** | Login as Teacher -> Try DELETE announcement | **HTTP 403 Forbidden** |
| **Billing** | Pay for "January" -> Reload | "Pay" button is DISABLED |
| **Mobile** | Switch Student | Dashboard data refreshes instantly |
| **Events** | Create Event as Teacher | Status is `PENDING`, not visible to Parents |

---

## 5. Execution Workflow

1.  **Stop Servers**: `npm stop` (Ensure clean DB state).
2.  **Phase 1 (Backend)**: Apply schema, migrate, update controllers.
3.  **Phase 2 (Admin)**: Update UI to match new schema.
4.  **Phase 3 (Mobile)**: Update App to consume new API fields.
5.  **Verify**: Run the checklist above.

---
*Created by Project Planner | Aligned with Antigravity Architecture*
