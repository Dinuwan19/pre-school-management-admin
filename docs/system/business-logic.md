# Business Logic & Calculation Engine

This document details the internal formulas and rules that drive the preschool assessment and financial systems.

---

## 📈 Student Progress Assessment

The system uses a non-academic, skill-based assessment model that tracks developmental milestones across 7 main skill categories.

### 1. Assessment Scale
Sub-skills are marked by teachers using a 3-level qualitative scale:
*   **Achieved** (Value: 3): Performs independently and consistently.
*   **Approaching** (Value: 2): Performs with guidance.
*   **Needs Support** (Value: 1): Requires frequent assistance.

### 2. Progress Calculation Formula
The progress percentage for a Main Skill is calculated dynamically based on its associated sub-skills:

$$Progress \% = \left( \frac{\sum \text{Sub-skill Scores}}{\text{Total Sub-skills} \times 3} \right) \times 100$$

### 3. Parent Interpretation Labels
To reduce pressure on parents, the actual percentages are mapped to qualitative labels in the Parent App:

| Percentage Range | Label Shown to Parent |
|------------------|-----------------------|
| 0% – 49% | **Emerging** |
| 50% – 74% | **Progressing** |
| 75% – 100% | **Well Developed** |

### 4. Coverage & Trends
*   **Coverage Logic**: A main skill is marked as "Fully Assessed" only when $\ge 80\%$ of its sub-skills have been recorded.
*   **Focus Areas**: Any sub-skill marked as "Needs Support" is automatically flagged in the Parent App as an area requiring home-based attention.

---

## 💰 Billing & Payment Logic

The financial system manages recurring monthly fees and one-time expenses without requiring a real-time payment gateway.

### 1. Billing Status Workflow
Every student's monthly record transitions through the following states:

1.  **UNPAID**: The initial state when a new billing month is generated.
2.  **PENDING**: Triggered when a parent uploads a bank receipt via the Parent App.
3.  **PAID**: Final state set manually by the **CASHIER** after verifying the uploaded bank receipt against the school's bank statement.

### 2. Due Date Calculation
A "Past Due" flag is automatically raised if the current date exceeds the `billingMonth` date and the status is not `PAID`. (Implemented in `backend/src/controllers/billing.controller.js`).

### 3. Expense Categorization
Expenses are recorded with global categories (e.g., Utilities, Salary, Maintenance) to provide a monthly P&L (Profit and Loss) summary in the Admin Dashboard.

---

## 📅 Attendance Rules

*   **Manual**: Teachers check students in/out via the Admin Web interface.
*   **QR-Based**: Staff scan student IDs at the entrance to auto-update check-in times.
*   **Auto-Absent**: Any student without a check-in by 9:30 AM on a non-holiday day is marked as `ABSENT` by the system's cron service.
