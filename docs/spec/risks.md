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

---

## 5. Step-by-Step Implementation Plan

This section provides a detailed implementation roadmap for the Risk and Hazard Management feature, organized by development phase.

### Phase 1: Database Schema and Types

**Step 1.1: Create Database Schema**
1. Create `risk_requirement_seq` sequence for generating RISK-{number} IDs
2. Create `riskRecords` table with columns:
   - `id` (VARCHAR, PRIMARY KEY, format: RISK-{number})
   - `title` (VARCHAR(200), UNIQUE, NOT NULL)
   - `description` (TEXT, NOT NULL)
   - `hazard` (TEXT, NOT NULL)
   - `harm` (TEXT, NOT NULL)
   - `foreseeable_sequence` (TEXT)
   - `severity` (INTEGER, 1-5 scale)
   - `probability_p1` (INTEGER, 1-5 scale)
   - `probability_p2` (INTEGER, 1-5 scale)
   - `p_total_calculation_method` (TEXT, NOT NULL) - Documentation of how P_total is calculated
   - `p_total` (INTEGER, 1-5 scale) - Calculated from P₁ and P₂
   - `residual_risk_score` (VARCHAR) - Format: "{severity}{p_total}"
   - `status` (VARCHAR) - 'draft', 'control_required', 'residual_risk_acceptable', 'overall_review_complete'
   - `revision` (INTEGER, DEFAULT 0)
   - `created_by` (UUID, FOREIGN KEY to users)
   - `created_at` (TIMESTAMP, DEFAULT NOW())
   - `last_modified` (TIMESTAMP)
   - `modified_by` (UUID, FOREIGN KEY to users)
   - `approved_at` (TIMESTAMP)
   - `approved_by` (UUID, FOREIGN KEY to users)
   - `deleted_at` (TIMESTAMP)
   - `approval_notes` (TEXT)
3. Create `controlMeasures` table with columns:
   - `id` (UUID, PRIMARY KEY)
   - `risk_record_id` (VARCHAR, FOREIGN KEY to riskRecords)
   - `description` (TEXT, NOT NULL)
   - `control_type` (VARCHAR) - 'design', 'protective', 'information'
   - `effectiveness` (TEXT)
   - `created_at` (TIMESTAMP, DEFAULT NOW())
   - `created_by` (UUID, FOREIGN KEY to users)
4. Create `riskAcceptabilityMatrix` table with columns:
   - `id` (UUID, PRIMARY KEY)
   - `severity` (INTEGER, 1-5)
   - `p_total` (INTEGER, 1-5)
   - `acceptability` (VARCHAR) - 'acceptable', 'unacceptable'
   - `created_at` (TIMESTAMP, DEFAULT NOW())
   - `updated_at` (TIMESTAMP)
5. Create indexes:
   - Primary key on `riskRecords.id`
   - Composite index on `(residual_risk_score, status)` for filtering
   - Composite index on `(deleted_at, status)` for soft delete filtering
   - Foreign key index on `controlMeasures.risk_record_id`
   - Composite unique index on `riskAcceptabilityMatrix(severity, p_total)`

**Step 1.2: Create TypeScript Types**
1. Create `src/types/risks.ts` with interfaces:
   - `RiskRecord` - Main risk record interface
   - `ControlMeasure` - Control measure interface
   - `RiskAcceptabilityMatrix` - Matrix configuration interface
   - `CreateRiskRecordRequest` - API request type
   - `UpdateRiskRecordRequest` - API request type
   - `RiskRecordResponse` - API response type
   - `RiskRecordListResponse` - List response with pagination

**Step 1.3: Update Database Seed Data**
1. Add seed data for `riskAcceptabilityMatrix` with default acceptability mappings
2. Add example risk records for testing (optional)

### Phase 2: Backend Implementation

**Step 2.1: Create Risk Calculation Service**
1. Create `src/server/services/riskCalculation.service.ts`:
   - Implement `calculatePTotal(p1: number, p2: number, method: string): number` function
   - Implement `calculateRiskScore(severity: number, pTotal: number): string` function
   - Implement `checkRiskAcceptability(severity: number, pTotal: number): 'acceptable' | 'unacceptable'` function
   - Implement `updateRiskStatus(riskRecord: RiskRecord): string` function

**Step 2.2: Create Risk Routes**
1. Create `src/server/routes/risks.ts`:
   - `GET /api/risks` - List all risks with filtering, sorting, pagination
   - `GET /api/risks/:id` - Get single risk record with full details
   - `POST /api/risks` - Create new risk record
   - `PATCH /api/risks/:id` - Update risk record
   - `POST /api/risks/:id/approve` - Approve risk record
   - `DELETE /api/risks/:id` - Soft delete risk record
   - `GET /api/risks/:id/downstream-traces` - Get system requirements linked as control measures

**Step 2.3: Implement CRUD Operations**
1. Implement list endpoint with:
   - Status filtering (draft, control_required, residual_risk_acceptable)
   - Sorting by ID, title, created date, risk score
   - Pagination support
   - Search functionality
2. Implement create endpoint with:
   - Validation of severity (1-5), P₁ (1-5), P₂ (1-5)
   - Calculation of P_total from P₁ and P₂
   - Calculation of initial risk score
   - Status determination based on risk acceptability matrix
   - Title uniqueness check
3. Implement update endpoint with:
   - Validation of updated values
   - Recalculation of P_total if P₁ or P₂ changed
   - Recalculation of risk scores
   - Status update logic
   - Revision tracking (increment only on approval)
4. Implement approve endpoint with:
   - Password verification
   - Revision increment
   - Status update to approved state
   - Audit trail logging

**Step 2.4: Implement Control Measures Management**
1. Add endpoints in `src/server/routes/risks.ts`:
   - `POST /api/risks/:id/control-measures` - Add control measure to risk
   - `PATCH /api/risks/:id/control-measures/:measureId` - Update control measure
   - `DELETE /api/risks/:id/control-measures/:measureId` - Remove control measure
2. Implement control measure validation:
   - Control type validation (design, protective, information)
   - Description requirements

**Step 2.5: Implement Risk Matrix Configuration**
1. Create `src/server/routes/riskMatrix.ts`:
   - `GET /api/risk-matrix` - Get current risk acceptability matrix
   - `POST /api/risk-matrix` - Create/update matrix configuration (admin only)
2. Implement matrix lookup service for risk acceptability checks

**Step 2.6: Extend Traces for Risk Records**
1. Update `src/server/routes/traces.ts` to support:
   - `from_type: 'risk'` and `to_type: 'system'` for risk-to-SR traces
   - Validation that risk records can trace to system requirements
2. Update trace queries to include risk records in upstream/downstream views

**Step 2.7: Add Audit Trail**
1. Extend audit logging to track:
   - Changes to severity, P₁, P₂, P_total calculation method
   - Control measure additions/modifications
   - Risk status changes
   - Risk score recalculations

### Phase 3: Frontend Implementation

**Step 3.1: Create Risk Store**
1. Create `src/client/stores/riskStore.ts` using Zustand:
   - State: `risks`, `selectedRisk`, `loading`, `error`
   - Actions: `fetchRisks`, `fetchRiskById`, `createRisk`, `updateRisk`, `approveRisk`, `deleteRisk`
   - Use shallow selectors for performance optimization

**Step 3.2: Create Risk API Service**
1. Create `src/client/services/risksApi.ts`:
   - Implement all API calls matching backend routes
   - Include proper error handling
   - Use TypeScript types from `src/types/risks.ts`

**Step 3.3: Create Risk List Components**
1. Create `src/client/components/organisms/RiskList.tsx`:
   - Display risk records in table format
   - Show ID, title, harm, severity, P_total, initial risk score, residual risk score, status
   - Implement filtering by status
   - Implement sorting by ID, title, created date, risk score
   - Add pagination controls
2. Create `src/client/components/molecules/RiskListItem.tsx`:
   - Individual risk row component
   - Display risk information with proper formatting
   - Link to risk detail page

**Step 3.4: Create Risk Detail View**
1. Create `src/client/components/pages/RiskDetailPage.tsx`:
   - Display full risk record information
   - Show hazard, harm, foreseeable sequence
   - Display severity, P₁, P₂, P_total calculation method, P_total
   - Show initial and residual risk scores
   - Display risk status and revision
   - Show approval information
2. Create `src/client/components/organisms/RiskEstimationForm.tsx`:
   - Form for entering/editing severity, P₁, P₂
   - Text area for P_total calculation method documentation
   - Display calculated P_total and risk score
   - Validation and error handling

**Step 3.5: Create Risk Creation/Edit Forms**
1. Create `src/client/components/organisms/RiskForm.tsx`:
   - Form fields: title, description, hazard, harm, foreseeable sequence
   - Risk estimation section (severity, P₁, P₂, calculation method)
   - Validation for all required fields
   - Save and cancel actions
2. Create `src/client/components/pages/RiskCreatePage.tsx`:
   - Wrapper page for risk creation
   - Uses RiskForm component
3. Create `src/client/components/pages/RiskEditPage.tsx`:
   - Wrapper page for risk editing
   - Loads existing risk data
   - Uses RiskForm component

**Step 3.6: Create Control Measures Interface**
1. Create `src/client/components/organisms/ControlMeasuresList.tsx`:
   - Display list of control measures for a risk
   - Show control type, description, effectiveness
   - Add/edit/delete controls
2. Create `src/client/components/molecules/ControlMeasureForm.tsx`:
   - Form for creating/editing control measures
   - Fields: description, control type (dropdown), effectiveness
   - Validation

**Step 3.7: Create Risk Matrix View**
1. Create `src/client/components/pages/RiskMatrixPage.tsx`:
   - Read-only display of risk acceptability matrix
   - Grid showing Severity (rows) × P_total (columns)
   - Color-coded cells for Acceptable/Unacceptable
   - Tooltip showing exact values

**Step 3.8: Create Approval Interface**
1. Create `src/client/components/molecules/RiskApprovalDialog.tsx`:
   - Password confirmation input
   - Approval notes text area
   - Approve and cancel actions
2. Integrate approval dialog into RiskDetailPage

**Step 3.9: Add Routing**
1. Update `src/client/main.tsx` routing:
   - `/risks` - Risk list page
   - `/risks/new` - Create risk page
   - `/risks/:id` - Risk detail page
   - `/risks/:id/edit` - Edit risk page
   - `/risks/matrix` - Risk matrix view page

**Step 3.10: Update Navigation**
1. Add "Risk Management" to main navigation menu
2. Add links to risk-related pages

### Phase 4: Integration and Testing

**Step 4.1: Unit Tests**
1. Create `tests/risks.test.ts`:
   - Test risk calculation service functions
   - Test P_total calculation from P₁ and P₂
   - Test risk score calculation
   - Test risk acceptability checks
   - Test status determination logic

**Step 4.2: API Integration Tests**
1. Extend `tests/risks.test.ts`:
   - Test all CRUD endpoints
   - Test approval workflow
   - Test control measures management
   - Test risk matrix configuration
   - Test traceability to system requirements
   - Test validation rules
   - Test soft delete functionality

**Step 4.3: E2E Tests**
1. Create `e2e/risks.spec.ts`:
   - Test risk creation flow
   - Test risk estimation with P₁, P₂, P_total
   - Test control measure addition
   - Test risk approval workflow
   - Test risk-to-SR traceability
   - Test filtering and sorting
   - Use direct URL navigation for reliability

**Step 4.4: Integration with Existing Features**
1. Update System Requirements detail view to show upstream risk records
2. Update trace management to support risk records
3. Ensure audit logging captures risk-related changes
4. Verify soft delete works consistently with other requirements

### Phase 5: Documentation and Deployment

**Step 5.1: API Documentation**
1. Create `docs/openapi/risks.yaml`:
   - Document all risk management endpoints
   - Include request/response schemas
   - Document validation rules
   - Include example requests/responses

**Step 5.2: Update README**
1. Add Risk and Hazard Management to feature list
2. Document risk calculation methodology
3. Update database schema documentation

**Step 5.3: User Documentation**
1. Create user guide for risk management workflow
2. Document P_total calculation method requirements
3. Document risk matrix configuration

**Step 5.4: Deployment Checklist**
1. Verify database migrations run successfully
2. Verify seed data includes risk matrix configuration
3. Test all endpoints in production-like environment
4. Verify audit trail captures all required events
5. Performance test with large datasets
6. Security review of risk calculation logic