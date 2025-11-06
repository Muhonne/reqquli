## 1. Feature Overview

**Feature Name:** requirements Traceability Management

**Feature Description:** Enhanced traceability management within requirement detail views using a junction table (traces) for many-to-many relationships. Users can manage trace relationships between user requirements and system requirements through dedicated trace editing interfaces. The junction table stores from_requirement_id, to_requirement_id, from_type, and to_type to support flexible traceability.

**Goal:** Provide intuitive trace relationship management directly within requirement views, allowing users to establish and modify bidirectional traceability relationships (upstream and downstream) regardless of requirement approval status.

## 2. Functional requirements (User Behaviors)

This section uses Gherkin syntax to describe the feature's behavior from the user's perspective. Each scenario acts as a clear, testable requirement.

```gherkin
Feature: requirements Traceability Management

Scenario: View Downstream Traces from User requirement
  Given I am a logged-in user
  And there is a user requirement "UR-1" with system requirements tracing to it
  When I navigate to the "UR-1" details page
  Then I see a "Downstream Traces" section
  And I see all system requirements that trace from this user requirement
  And each traced system requirement shows its ID, title, and current status
  And I can click on any traced system requirement to navigate to its details

Scenario: View Upstream Trace from System requirement
  Given I am a logged-in user
  And there is a trace relationship from "UR-1" to "SR-1" in traces
  When I navigate to the "SR-1" details page
  Then I see an "Upstream Trace" section
  And I see the user requirement "UR-1" that has a trace to this system requirement
  And I can click on the traced user requirement to navigate to its details

Scenario: Edit System requirement Trace Link
  Given I am a logged-in user
  And there is a trace relationship from "UR-1" to "SR-1" in traces
  And there is another user requirement "UR-2"
  When I navigate to the "SR-1" details page
  And I click "Edit Traces"
  Then I see the current trace relationships
  And I can remove the trace from "UR-1" and add a trace from "UR-2"
  And I can save the changes
  Then the traces table shows "UR-2" to "SR-1" relationship

Scenario: Edit Traces Using Dedicated Button
  Given I am a logged-in user
  And there is a user requirement "UR-1" with existing downstream trace relationships
  When I navigate to the "UR-1" details page
  And I click "Edit Traces" button
  Then I see a dedicated trace editing interface
  And I can add new downstream system requirements
  And I can remove existing downstream trace relationships
  And I can save all trace changes at once

Scenario: Add Downstream Trace from User requirement
  Given I am a logged-in user
  And there is a user requirement "UR-1" 
  And there is an existing system requirement "SR-5" without any trace
  When I navigate to the "UR-1" details page
  And I click "Edit Traces"
  Then I can select "SR-5" from a dropdown of available system requirements
  And I can add it as a downstream trace
  And I can save the changes
  Then traces table contains a relationship from "UR-1" to "SR-5"

Scenario: Add New System requirement from User requirement View
  Given I am a logged-in user
  And there is an approved user requirement "UR-1"
  When I navigate to the "UR-1" details page
  And I click "Add System requirement" in the Downstream Traces section
  Then I am navigated to the system requirement creation form
  And after creating the system requirement, a trace relationship can be established
  And I can complete the form and save the new system requirement

Scenario: Remove Downstream Trace from User requirement
  Given I am a logged-in user
  And there is a user requirement "UR-1" with downstream system requirement "SR-3"
  When I navigate to the "UR-1" details page
  And I click "Edit Traces"
  Then I can see "SR-3" listed as a downstream trace
  And I can remove the trace relationship
  And I can save the changes
  Then system requirement "SR-3" becomes orphaned (no trace)

```

## 3. Technical requirements

This section details the engineering work for each Gherkin scenario. API specifications are included in existing openapi files.

### 3.1 Backend Functionality

**Trace Relationship Management:** Implements bidirectional traceability through traces junction table as defined in trace viewing and editing scenarios.

**Trace Link Validation:** Validates trace relationships to maintain data integrity and prevent invalid relationships as defined in editing scenarios.

**Junction Table Operations:** Manages INSERT and DELETE operations on traces table for establishing and removing trace relationships.

**Validation requirements:**
- Verify trace references are valid requirement IDs  
- Validate trace link changes maintain data integrity
- Ensure user authentication for all trace operations
- Handle transaction rollback for batch trace operations

**Business Logic:**
- Trace relationships managed independently from requirement approval status
- Traces stored in traces table with from_requirement_id, to_requirement_id, from_type, to_type
- Many-to-many relationships supported between requirements
- Orphaned requirements (no traces) are permitted
- Supports tracing between user requirements, system requirements, and test cases

### 3.2 Frontend Functionality

**UI Components:**
- **Edit Traces Button:** Dedicated button for accessing trace editing interface
- **Trace Editing Interface:** Modal or panel for managing all trace relationships  
- **Downstream Traces Section:** Display component showing all requirements that trace from current requirement
- **Upstream Trace Section:** Display component showing the requirement that current requirement traces from
- **Downstream Trace Selector:** Dropdown for selecting existing requirements to add as downstream traces
- **Trace Relationship Manager:** Interface for adding/removing multiple trace relationships

**Associated Behavior:** Implements complete trace link management across requirement levels with status-aware editing capabilities.

### 3.3 Database Design

**Database Schema:**
- traces table manages all trace relationships
- No traceFrom field in requirements tables
- Junction table allows flexible many-to-many relationships

**Enhanced Queries:**
- Downstream traces: `SELECT * FROM traces WHERE from_requirement_id = ? AND from_type = ?`
- Upstream traces: `SELECT * FROM traces WHERE to_requirement_id = ? AND to_type = ?`
- Insert trace: `INSERT INTO traces (from_requirement_id, to_requirement_id, from_type, to_type, created_by) VALUES (?, ?, ?, ?, ?)`
- Delete trace: `DELETE FROM traces WHERE id = ?`

**Indexes required:**
- Primary: `id` on traces
- Composite: `(from_requirement_id, from_type)` for upstream queries
- Composite: `(to_requirement_id, to_type)` for downstream queries

## 4. Manual Verification Protocol

### Test Case 1: View Downstream and Upstream Traces
*Maps to "View Downstream Traces" and "View Upstream Trace" scenarios*

1. **Step 1:** Login as user
2. **Step 2:** Navigate to user requirement with downstream system requirements
3. **Step 3:** Verify downstream traces section displays correctly
4. **Step 4:** Navigate to system requirement with upstream trace
5. **Step 5:** Verify upstream trace section displays correctly

**Expected Result:** Both downstream and upstream traces display correctly with clickable navigation.

### Test Case 2: Edit System requirement Trace Links
*Maps to "Edit System requirement Trace Link" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Navigate to system requirement with existing trace
3. **Step 3:** Click "Edit Traces" button
4. **Step 4:** Change trace to different user requirement
5. **Step 5:** Save changes and verify trace updated

**Expected Result:** System requirement trace links can be modified regardless of approval status.

### Test Case 3: Edit Traces Using Dedicated Interface  
*Maps to "Edit Traces Using Dedicated Button" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Navigate to user requirement with existing downstream traces
3. **Step 3:** Click "Edit Traces" button
4. **Step 4:** Verify trace editing interface opens
5. **Step 5:** Test adding/removing downstream trace relationships
6. **Step 6:** Save all changes at once

**Expected Result:** Dedicated trace editing interface functions with batch save capability.

### Test Case 4: Add and Remove Downstream Traces
*Maps to "Add/Remove Downstream Trace" scenarios*

1. **Step 1:** Login as user
2. **Step 2:** Navigate to user requirement
3. **Step 3:** Use "Edit Traces" to add orphaned system requirement as downstream trace
4. **Step 4:** Verify system requirement now traces from user requirement
5. **Step 5:** Remove the downstream trace relationship  
6. **Step 6:** Verify system requirement becomes orphaned

**Expected Result:** Downstream trace relationships can be added and removed, creating/removing orphaned system requirements.

### Test Case 5: Create New System requirements with Pre-populated Traces
*Maps to "Add New System requirement from User requirement View" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Navigate to user requirement
3. **Step 3:** Click "Add System requirement" in downstream traces section
4. **Step 4:** Verify creation form opens with traceFrom pre-populated
5. **Step 5:** Complete and save new system requirement

**Expected Result:** New system requirements created with correct trace relationships pre-established.