## 1. Feature Overview

**Feature Name:** Audit Logging and Event Tracking

**Feature Description:** A comprehensive audit logging system that tracks all system activities including authentication, requirement changes, approvals, trace edits, and test executions. Users can view detailed audit trails with filtering, search by entity or user, and access system-wide metrics and activity summaries.

**Goal:** Provide complete audit trail visibility for regulatory compliance, allowing tracking of all system activities with detailed event history, user accountability, and temporal analysis capabilities.

## 2. Functional requirements (User Behaviors)

This section uses Gherkin syntax to describe the feature's behavior from the user's perspective. Each scenario acts as a clear, testable requirement.

```gherkin
Feature: Audit Logging and Event Tracking

Scenario: View All Audit Events with Pagination
  Given I am a logged-in user
  When I navigate to the audit events page
  Then I see a list of all audit events in chronological order
  And each event displays timestamp, user, action, and entity type
  And I can see pagination controls with default limit of 50 events
  And I can navigate between pages to view additional events

Scenario: Filter Audit Events by Type
  Given I am a logged-in user
  And I am viewing the audit events page
  When I filter events by type "user_requirement"
  Then I see only events related to user requirement operations
  And I can filter by types: authentication, user_requirement, system_requirement, trace, test_case, test_run
  And filtering updates the event list in real-time

Scenario: Filter Audit Events by Date Range
  Given I am a logged-in user
  And I am viewing the audit events page
  When I specify a start date and end date
  Then I see only events within that date range
  And events before start date are not displayed
  And events after end date are not displayed

Scenario: Filter Audit Events by User
  Given I am a logged-in user
  And I am viewing the audit events page
  When I select a user from the filter options
  Then I see only events performed by that user
  And the user's full name is displayed with each event

Scenario: Filter Audit Events by Entity ID
  Given I am a logged-in user
  And I am viewing the audit events page
  When I enter an entity ID (e.g., "UR-1" or "SR-5")
  Then I see only events related to that entity
  And all event types (create, update, approve, delete) for that entity are shown

Scenario: View Entity-Specific Audit Trail
  Given I am a logged-in user
  And I am viewing a user requirement "UR-1" details page
  When I click "View Audit Trail"
  Then I see all historical events for "UR-1"
  And events are displayed in chronological order (oldest first)
  And each event shows who performed it, what action, and when
  And I can see status changes, approvals, edits, and deletions

Scenario: View User Activity Timeline
  Given I am a logged-in user
  When I navigate to the user activity page
  And I select a specific user
  Then I see all events performed by that user
  And events are displayed in chronological order
  And I can see a summary of their activity (last active time, total events)
  And I can filter by date range within user's activity

Scenario: View User Activity Summary
  Given I am a logged-in user
  When I navigate to the user activity summary page
  Then I see a list of all users with their activity metrics
  And each user shows: name, last active timestamp, total events count
  And I can see recent activity types for each user (approvals, edits, deletions)
  And I can click on a user to drill down into their full event history

Scenario: View Audit Timeline by Date
  Given I am a logged-in user
  When I navigate to the audit timeline view
  Then I see events grouped by date
  And each day shows all events that occurred on that date
  And I can filter timeline by entity type or date range
  And timeline is sorted with most recent dates at the top

Scenario: Track Requirement Lifecycle Through Audit Trail
  Given I am a logged-in user
  And there is a user requirement "UR-1" with a complete lifecycle
  When I view the audit trail for "UR-1"
  Then I see the complete history: creation → edits → approvals → traces
  And I can identify who made each change and when
  And I can verify that revision numbers match approval events
```

## 3. Technical requirements

This section details the engineering work for each Gherkin scenario. For detailed API specifications, refer to `/docs/spec/openapi/audit.yaml`.

### 3.1 Backend Functionality

**Event Logging:** Automatic logging of all system activities through database operations. Every INSERT, UPDATE, and DELETE operation in user_requirements, system_requirements, test_cases, test_runs, and traces tables automatically generates an audit event. Authentication events (login, logout, registration, email verification) are also logged.

**Event Retrieval:** Implements filtering, sorting, and pagination for audit events as defined in event viewing scenarios with multiple query perspectives (global events, entity-specific trails, user activity, timeline view).

**Validation requirements:**
- User authentication verification for all audit endpoints
- Date range validation for temporal queries
- Entity ID validation and existence checking
- User ID validation and authorization checking
- Event type validation against allowed types

**Business Logic:**
- Event creation triggered by database operations (INSERT, UPDATE, DELETE)
- Event details captured include: id (UUID), eventType, action, entityType, entityId, userId, userFullName, timestamp, success flag
- Optional custom details object for operation-specific metadata (e.g., which fields changed, previous values)
- Immutable event records (no deletion, only creation and reading)
- Events retained indefinitely for compliance purposes
- Timestamp automatically set at database operation time (UTC timezone)
- User context captured from authenticated session for each operation

### 3.2 Frontend Functionality

**UI Components:**
- **Audit Events List View:** Paginated table with filter controls for type, date, user, and entity ID
- **Entity Audit Trail:** Modal or sidebar showing complete event history for a specific entity
- **User Activity Page:** Dashboard showing per-user activity summary with statistics
- **Timeline View:** Calendar/chronological view of events grouped by date
- **Filter Controls:** Multi-select dropdowns for event types, date range pickers, search inputs

**Associated Behavior:** Implements comprehensive audit visibility with multiple view perspectives (global, entity, user, timeline).

### 3.3 Database Design

**Audit Tables:**

```sql
audit_events:
- id (UUID, primary key)
- eventType (VARCHAR: user_requirement, system_requirement, trace, test_case, test_run, authentication)
- action (VARCHAR: create, update, approve, delete, login, logout, verify, email_verified)
- entityType (VARCHAR: user_requirement, system_requirement, test_case, test_run, trace, user)
- entityId (VARCHAR: references entity IDs)
- userId (UUID: foreign key to users.id)
- userFullName (VARCHAR: cached for audit trail readability)
- details (JSONB: operation-specific metadata, previous values for updates)
- timestamp (TIMESTAMP WITH TIME ZONE: set at operation time in UTC)
- success (BOOLEAN: whether operation succeeded)
```

**Indexes required:**
- Primary: `id` on audit_events
- Composite: `(eventType, timestamp)` for event type filtering with sorting
- Composite: `(entityType, entityId, timestamp)` for entity-specific audit trail
- Composite: `(userId, timestamp)` for user activity tracking
- Composite: `(timestamp)` for timeline queries
- Partial: `(timestamp)` WHERE `success = true` for successful operations only

**Event Logging Implementation:**
- **INSERT Operations:** Create "create" action events when new requirements, test cases, or test runs are created
- **UPDATE Operations:** Create "update" or "approve" action events when requirements are modified or approved
- **DELETE Operations:** Create "delete" action events when requirements are soft-deleted (deletedAt set)
- **Trace Operations:** Create trace-related events when trace relationships are created or deleted
- **Authentication:** Create authentication events for login, logout, registration, email verification
- Capture user context (userId, userFullName) from authenticated session at operation time
- Store operation metadata (changed fields, previous values) in details JSONB field
- Timestamp automatically captured in UTC at database operation time
- Implementation via: Database triggers OR application-level event capture in service layer

## 4. Manual Verification Protocol

### Test Case 1: View and Filter Audit Events
*Maps to "View All Audit Events" and "Filter Audit Events" scenarios*

1. **Step 1:** Login as user and navigate to audit events page
2. **Step 2:** Verify events display in chronological order
3. **Step 3:** Apply filter by event type (e.g., "approval")
4. **Step 4:** Verify only approval events display
5. **Step 5:** Apply date range filter
6. **Step 6:** Verify events outside range are hidden
7. **Step 7:** Test pagination with large result sets

**Expected Result:** Events display correctly with all filter combinations working as expected.

### Test Case 2: View Entity-Specific Audit Trail
*Maps to "View Entity-Specific Audit Trail" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Navigate to a requirement detail page (e.g., UR-1)
3. **Step 3:** Click "View Audit Trail" button
4. **Step 4:** Verify all events for that requirement display
5. **Step 5:** Verify events include: creation, edits, approvals, trace changes
6. **Step 6:** Verify chronological order and timestamps
7. **Step 7:** Verify user names and actions are correct

**Expected Result:** Complete audit trail shows all operations on the entity in correct order.

### Test Case 3: Track User Activity
*Maps to "View User Activity Timeline" and "View User Activity Summary" scenarios*

1. **Step 1:** Login as user
2. **Step 2:** Navigate to user activity summary page
3. **Step 3:** Verify all active users are listed
4. **Step 4:** Verify each user shows last active timestamp and event count
5. **Step 5:** Click on a user to view their detailed activity
6. **Step 6:** Verify all events performed by that user display
7. **Step 7:** Test date range filtering within user activity

**Expected Result:** User activity tracking displays accurately with navigable detail views.

### Test Case 4: View System Metrics and Timeline
*Maps to "View System-Wide Audit Metrics" and "View Audit Timeline by Date" scenarios*

1. **Step 1:** Login as user
2. **Step 2:** Navigate to audit metrics page
3. **Step 3:** Verify system metrics display: total events, breakdown by type, active users
4. **Step 4:** Apply date range to metrics
5. **Step 5:** Navigate to timeline view
6. **Step 6:** Verify events are grouped by date
7. **Step 7:** Verify timeline can be filtered by entity type

**Expected Result:** Metrics and timeline provide system-wide visibility into audit activities.

### Test Case 5: Complete Requirement Lifecycle Tracking
*Maps to "Track Requirement Lifecycle Through Audit Trail" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Create a new user requirement with title "New Requirement"
3. **Step 3:** System auto-generates ID (e.g., UR-42)
4. **Step 4:** View audit trail for the newly created requirement (should show creation event)
5. **Step 5:** Edit the requirement description
6. **Step 6:** View audit trail (should show edit event with changed fields in details)
7. **Step 7:** Approve the requirement
8. **Step 8:** View audit trail (should show approval event with revision increment from 0 to 1)
9. **Step 9:** Add a trace relationship to a system requirement
10. **Step 10:** View audit trail (should show trace creation event)
11. **Step 11:** Verify complete lifecycle is visible and chronologically ordered with all database operations logged

**Expected Result:** Complete requirement lifecycle is audited and viewable with all database operation events (INSERT on create, UPDATE on edit, UPDATE on approve, INSERT on trace) tracked chronologically.
