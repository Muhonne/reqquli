## 1. Feature Overview

**Feature Name:** ⚠️ Risk and Hazard Management

**Feature Description:** A specialized system for managing the entire medical device risk lifecycle (per **ISO 14971**), enabling the creation, analysis, evaluation, control, and review of identified **hazards** and associated **risks**. This feature ensures risk acceptance criteria are consistently applied, and all risk control measures are traceable to the specific risks they mitigate. Risk estimation relies on individual probabilities (P₁ and P₂) which are used to calculate Total Probability (P_total), the value used in the final risk scoring matrix. Manufacturers must systematically define, document, and justify their methods for assigning values to P₁, P₂, and calculating P_total.

**Goal:** Provide a comprehensive, auditable system for managing medical device risk from initial hazard identification through overall residual risk review, ensuring **full traceability** from Hazard → Harm → Risk Estimate → Control Measures → Residual Risk.

---

## 2. Functional Requirements (User Behaviors)

This section uses Gherkin syntax to describe the feature's behavior from the user's perspective. Each scenario acts as a clear, testable requirement.

```gherkin
Feature: Risk and Hazard Management (ISO 14971 Compliance)

Scenario: Browse Risks and Hazards
  Given I am a logged-in Risk Manager
  When I navigate to the risk management list page
  Then I see a list of all identified hazards and their associated risks
  And each risk displays its ID, associated harm, Initial Risk (Severity x P_total), and Residual Risk
  And I can filter requirements by status (draft, approved)
  And I can sort risks by ID, title, or created date

Scenario: Identify and Estimate New Risk
  Given I am a logged-in user with risk creation permissions
  When I navigate to the risk management page
  And I click "Identify New Hazard"
  And I fill in the hazard "Sharps on Packaging"
  And I fill in the foreseeable sequence of events
  And I estimate the severity "3 (Serious)"
  And I estimate the individual probability P₁ "C (Unlikely)"
  And I estimate the individual probability P₂ "B (Occasional)"
  And I document the method for calculating Total Probability (P_total) from P₁ and P₂
  And I click "Save Risk Estimate"
  Then a new Risk Record is created with P_total calculated from P₁ and P₂
  And Initial Risk is calculated as "3" combined with P_total
  And the record status is set to "Control Required" if Initial Risk is unacceptable per plan

Scenario: Implement and Evaluate Risk Control Measures
  Given I am a logged-in Risk Manager
  And there is a Risk Record "RISK-005" with status "Control Required"
  When I navigate to the risk details page
  And I add a Control Measure: "Implement rounded plastic packaging edges"
  And I specify the Control Measure Type as "Inherent Safety by Design"
  And I re-estimate the post-control individual probability P₁ to "A (Remote)"
  And I re-estimate the post-control individual probability P₂ to "A (Remote)"
  And I document the updated method for calculating Total Probability (P_total) from the new P₁ and P₂
  And I click "Save Residual Risk"
  Then the Residual Risk P_total is recalculated from the updated P₁ and P₂
  And Residual Risk is calculated as "3" combined with the new P_total
  And the Residual Risk is compared against the acceptability criteria
  And the record status is updated (e.g., to "Residual Risk Acceptable")

Scenario: Trace Risk to System Requirement (Control Measure)
  Given I am a logged-in Risk Manager
  And there is a Risk Record "RISK-007" with an approved Control Measure
  And there is an approved System Requirement "SR-42: Implement safety interlock"
  When I navigate to the Risk Record "RISK-007" details page
  And I link "SR-42" to the Control Measure
  Then a traceable link is established in the traces table
  And "SR-42" is visible as a control measure in the Risk Record view
  And "RISK-007" is visible as an upstream source in the System Requirement view
```

---

## 3. Technical Requirements

This section details the engineering work for each Gherkin scenario. For detailed API specifications, refer to `/docs/openapi/risks.yaml`.

### 3.1 Backend Functionality

**Risk Matrix Engine:** Implements the core business logic for risk calculation:
* Takes inputs (Severity and individual probabilities P₁, P₂) and computes **Total Probability (P_total)** using the manufacturer-defined calculation method.
* Uses P_total (not individual P₁ or P₂) combined with Severity to compute **Initial and Residual Risk scores**.
* Compares risk scores against the **pre-defined Risk Acceptability Matrix** (stored configuration).
* Handles updates to the risk score based on the effectiveness of implemented controls.
* Requires systematic definition, documentation, and justification of methods for assigning values to P₁, P₂, and calculating P_total.

**CRUD Operations:** Handles create, update, and read operations for Risk Records, Control Measures, and the associated Hazard/Harm details.

**State Management:** Manages the lifecycle status of a risk (e.g., Draft, Control Required, Residual Risk Acceptable, Overall Review Complete).

**Traceability Management:** Extends the existing `traces` junction table to allow many-to-many relationships between `Risk Records` and **System Requirements** (as the control measure implementation).

**Validation Requirements:**
* Severity inputs must conform to the defined scale (e.g., 1-5).
* Individual probability inputs P₁ and P₂ must conform to the defined scale (e.g., 1-5).
* Total Probability (P_total) calculation method must be defined, documented, and justified by the manufacturer.
* P_total must be calculated from P₁ and P₂ before risk scoring (P_total is the value used in the final risk scoring matrix, not P₁ or P₂ individually).
* Control Measures must specify a **Control Type** (Design, Protective, Information).
* Post-control risk estimate (with updated P₁, P₂, and recalculated P_total) must be provided before status can move to "Acceptable" (unless initial risk was acceptable).
* Title uniqueness and length constraints (as defined in README.md business rules).
* User authentication verification.
* Request rate limiting for resource protection.

**Business Logic:**
* Initial Risk calculation uses Severity combined with P_total (calculated from P₁ and P₂) to determine the risk score.
* Initial Risk calculation triggers state change to "Control Required" if the score is mapped as Unacceptable in the matrix.
* Residual Risk calculation recalculates P_total from updated P₁ and P₂ values, then combines with Severity to determine the residual risk score.
* Residual Risk calculation triggers comparison against the matrix and updates the risk status.
* **Audit trail** required for all changes to Severity, individual probabilities (P₁, P₂), P_total calculation method, and Control Measures.

### 3.2 Frontend Functionality

**UI Components:**
* **Risk Matrix Configuration View:** Read-only view of the organization's Risk Acceptability Matrix.
* **Risk/Hazard List View:** Filterable, sortable table displaying initial and residual risk scores.
* **Risk Record Detail View:** Dedicated view for **Hazard identification**, **Harm definition**, **Risk Estimation** (with individual probabilities P₁, P₂, Total Probability P_total calculation method, and resulting risk score), **Control Measure documentation**, and **Residual Risk estimation**.
* **Control Measure Traceability:** Interface to link Control Measures to existing System Requirements.

**Associated Behavior:** Provides a guided workflow for risk assessment, ensuring users follow the sequence: Identify → Estimate → Control → Re-estimate.

### 3.3 Database Design

**Indexes Required:**
* Primary: `id` (unique) on `riskRecords`
* Composite: `(residual_risk_score, status)` for filtering and sorting
* Composite: `(associated_system_requirement_id)` on the `traces` table for quick lookups of control measures.

**New Tables:**
* `riskRecords`: Stores primary risk details, individual probabilities (P₁, P₂), Total Probability (P_total), P_total calculation method documentation, initial scores, residual scores, and overall status.
* `controlMeasures`: Stores details of risk controls (description, type, effectiveness), linked one-to-many to `riskRecords`.
* `riskAcceptabilityMatrix`: Configuration table storing the mapping of (Severity, P_total) pairs to Acceptability (Acceptable/Unacceptable).

**Soft Delete Implementation:**
* Never physically delete records.
* Set `deletedAt` timestamp when deleting.
* All queries filter by `deletedAt IS NULL` by default.

---

## 4. Manual Verification Protocol

### Test Case 1: Identify and Estimate New Risk
*Maps to "Identify and Estimate New Risk" scenario*

1.  **Step 1:** Login as Risk Manager
2.  **Step 2:** Click "Identify New Hazard"
3.  **Step 3:** Enter Hazard, Harm, Severity=5 (Catastrophic)
4.  **Step 4:** Enter individual probability P₁=D (Frequent)
5.  **Step 5:** Enter individual probability P₂=C (Unlikely)
6.  **Step 6:** Document the method for calculating Total Probability (P_total) from P₁ and P₂
7.  **Step 7:** Save the record
8.  **Step 8:** Verify **P_total is calculated from P₁ and P₂ using the documented method**
9.  **Step 9:** Verify **Initial Risk Score is calculated as "5" combined with P_total**
10. **Step 10:** Verify **Status is "Control Required"** (assuming the calculated risk score is Unacceptable in the matrix)

**Expected Result:** Risk Record created with individual probabilities P₁ and P₂ documented, P_total calculated, and initial risk score correctly calculated and flagged for control implementation if unacceptable.

### Test Case 2: Implement and Evaluate Risk Control Measures
*Maps to "Implement and Evaluate Risk Control Measures" scenario*

1.  **Step 1:** Select the "Control Required" Risk Record from Test Case 1.
2.  **Step 2:** Add a Control Measure (e.g., "Change sterile barrier design").
3.  **Step 3:** Update Post-Control individual probability P₁ to B (Occasional).
4.  **Step 4:** Update Post-Control individual probability P₂ to A (Remote).
5.  **Step 5:** Document the updated method for calculating Total Probability (P_total) from the new P₁ and P₂
6.  **Step 6:** Save Residual Risk
7.  **Step 7:** Verify **P_total is recalculated from the updated P₁ and P₂ using the documented method**
8.  **Step 8:** Verify **Residual Risk Score is calculated as "5" combined with the new P_total**
9.  **Step 9:** Verify **Status updates to "Residual Risk Acceptable"** (assuming the calculated residual risk score is acceptable in the matrix).

**Expected Result:** Control measure documented, individual probabilities P₁ and P₂ updated, P_total recalculated, residual risk calculated, and status correctly updated based on the matrix.

### Test Case 3: Verify Traceability to System Requirements
*Maps to "Trace Risk to System Requirement" scenario*

1.  **Step 1:** Select the Risk Record from Test Case 2.
2.  **Step 2:** Link the Control Measure to an approved System Requirement (e.g., SR-99).
3.  **Step 3:** Navigate to the System Requirement (SR-99) detail page.
4.  **Step 4:** Verify the **Risk Record (RISK-005) appears as an upstream trace/source** in the SR-99 view.

**Expected Result:** Bidirectional trace link successfully established and displayed between the Risk Record and the controlling System Requirement.