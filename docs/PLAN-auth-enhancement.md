# PLAN: Authentication Enhancement

## Deliverables
| Deliverable | Location |
|-------------|----------|
| Project Plan | `docs/PLAN-auth-enhancement.md` |
| Task Breakdown | Inside this file |
| Agent Assignments | Backend Specialist, Frontend Specialist |
| Verification Checklist | See Phase 4 |

## Phase 1: Database & Security Services
- Implement OTP and Temp Password models in Prisma.
- Set up NodeMailer for secure email communication.
- Implement `MFM_` username prefix logic.

## Phase 2: Staff/Teacher Scoping
- **Restricted Access**: Teachers only see students/parents in their `assignedClassroomId`.
- **Action Filters**: Teachers cannot add students or parents.
- **Approval Flow**: Teacher-created events require Admin approval.

## Phase 3: Portal Isolation
- Prevent teachers from logging in through administrative endpoints.
- Scoped Dashboard UI for Teachers (Remove Billing/Payments).

## Phase 4: Verification
- [ ] Verify Super Admin can create Teachers with Auto-generated Email.
- [ ] Verify Teacher sees only assigned classroom data.
- [ ] Verify 403 Forbidden for Teachers visiting billing routes.
