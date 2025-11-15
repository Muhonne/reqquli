## 1. Feature Overview

**Feature Name:** Manual Test Run Management

**Feature Description:** A system for executing manual test runs containing multiple test cases. Users can create test runs, execute test cases step-by-step, track results at multiple levels (step, test case, test run), and maintain full traceability from system requirements through to test results.

**Goal:** Enable systematic manual testing with clear pass/fail criteria at each level, re-run capabilities, and complete requirement traceability.

**Note:** Test Runs use the unified approval workflow defined in `approval-workflow.md` for approving completed test runs (password confirmation, status transitions, etc.). This specification focuses on Test Run-specific functionality (execution, result calculation, etc.).

## 2. Functional requirements (User Behaviors)

```gherkin
Feature: Manual Test Run Execution

Scenario: Create a manual test run with multiple test cases
  Given I am a logged-in user
  And there are approved test cases linked to system requirements
  When I create a new manual test run
  And I select multiple test cases to include
  Then a new test run is created with status "not_started"
  And all selected test cases are linked to the test run

Scenario: Execute test steps within a test case
  Given I have an active test run with multiple test cases
  When I start executing a test case
  And I fill in the actual result for each step sequentially
  And I mark each step as "pass" or "fail"
  And I optionally attach a file as evidence for any step
  And I can see an icon that there is unsaved data
  Then the step results are saved immediately with my user ID
  And I see that an icon that data is saved
  And any uploaded files are linked to their respective steps
  And the test case status is calculated from its step results
  And I can see the progress of completed steps
  And each step shows who executed it

Scenario: Determine test case result from step results
  Given I have completed all steps in a test case
  When all steps have been marked as "pass"
  Then the test case result is automatically set to "pass"
  When any step has been marked as "fail"
  Then the test case result is automatically set to "fail"

Scenario: Re-run a test case
  Given the test run is not yet approved
  When I select a test case
  And I click "Re-run Test Case"
  Then I see a modal that warns that existing results are cleared
  Then I click continue
  Then the existing test case results are cleared
  And I can fill in new step results
  And the new results overwrite the previous results

Scenario: Determine test run result from test case results
  Given I have executed all test cases in a test run
  When all test cases have status "pass"
  Then the test run status shows "pass"
  When any test case has status "fail"
  Then the test run status shows "fail"


Scenario: View traceability from requirement to test result
  Given an approved test run exists
  When I view a system requirement
  Then I can see all test cases linked to that requirement
  And I can see the test results from the latest test run
  And I can navigate from requirement → test case → test result → test run
```

## 3. Technical requirements

### 3.1 Backend Functionality

**Test Run Management API:**

- `GET /api/test-runs`: List all test runs with filtering by status, creator, date range.

- `POST /api/test-runs`: Create a new test run with selected test cases. Returns a unique run_id and initializes all test case executions with "not_started" status.

- `GET /api/test-runs/:run_id`: Retrieve test run details including all test cases, their current execution status, and calculated results.

- `PUT /api/test-runs/:run_id/approve`: Approve a completed test run. Implements the approval workflow as defined in `approval-workflow.md`. Validates that all test cases have been executed and locks the run from further modifications.

- `GET /api/test-cases`: List available test cases for selection when creating a test run, filtered by status="approved".

**Test Case Execution API:**

- `POST /api/test-runs/:run_id/test-cases/:test_case_id/execute`: Start or re-run a test case execution. Clears any existing results and resets the test case to "in_progress".

- `PUT /api/test-runs/:run_id/test-cases/:test_case_id/steps/:step_number`: Update individual step results. Accepts status (pass/fail), actual_result, and optional evidence_file_id. Records the current logged-in user as executor. Automatically recalculates test case status after each step update.

- `POST /api/test-runs/:run_id/test-cases/:test_case_id/steps/:step_number/upload`: Upload evidence file for a test step. Returns file_id to be linked to the step result.

- `GET /api/evidence/:file_id`: Download evidence file by ID.

**Result Calculation Logic:**

- **Step Level → Test Case Level:** A test case passes only if ALL steps pass. Any failed step results in a failed test case.

- **Test Case Level → Test Run Level:** A test run passes only if ALL test cases pass. Any failed test case results in a failed test run.

- **Re-run handling:** When a test case is re-run, all previous step results are deleted and the test case starts fresh. No history is maintained.

**Traceability API:**

- `GET /api/requirements/:req_id/test-coverage`: Returns all test cases linked to a requirement and their latest execution results.

- `GET /api/test-cases/:test_case_id/results`: Returns all test run executions for a specific test case with full result details.

### 3.2 Frontend Functionality

**Test Run Creation:**
- Multi-select interface for choosing test cases
- Display of linked system requirements for each test case
- Clear indication of test case dependencies and priorities

**Test Execution Interface:**
- Step-by-step form with clear navigation between steps
- Real-time save of step results without losing progress
- Visual indicators for step status (pending/pass/fail)
- File upload button for each step to attach evidence
- Display thumbnails of attached files with download links
- Progress tracker showing completion percentage
- Clear indication when a test case is being re-run

**Results Dashboard:**
- Hierarchical view: Test Run → Test Cases → Steps
- Color-coded status indicators at each level
- Re-run button enabled only for test cases in non-approved test runs
- Clear display of calculated vs manual results

### 3.3 Database Design

**Core Tables:**

```sql
testing.test_runs:
- id, name, description, status (not_started/in_progress/complete/approved)
- created_by, created_at, approved_by, approved_at
- overall_result (pass/fail/pending)

testing.test_run_cases:
- id, test_run_id, test_case_id
- status (not_started/in_progress/complete)
- result (pass/fail/pending)
- started_at, completed_at, executed_by

testing.test_step_results:
- id, test_run_case_id, step_number
- expected_result, actual_result
- status (pass/fail/not_executed)
- evidence_file_id (nullable, FK to evidence files)
- executed_at, executed_by

testing.evidence_files:
- id, file_name, file_path, file_size, mime_type
- uploaded_by, uploaded_at
- checksum (for integrity verification)

Note: Test case links to system requirements are managed through the unified traces table
- Test cases can have upstream traces to system requirements (from_type='system', to_type='testcase')
```

**Result Calculation:**
- Use database triggers or application logic to automatically calculate:
  - `test_run_cases.result` when all steps are complete
  - `test_runs.overall_result` when all test cases have results

## 4. Manual Verification Protocol

**Test Case 1: Complete Test Run Workflow**
1. Create a new test run with 3 test cases
2. Execute first test case with all steps passing
3. Execute second test case with one step failing
4. Execute third test case with all steps passing
5. Verify test run shows as "Failed"
6. Re-run the failed test case with all steps passing
7. Verify test run now shows as "Passed"

**Expected Result:** Test run status correctly reflects the aggregate of test case results, re-runs work properly. For approval workflow testing, see `approval-workflow.md`.

**Test Case 2: Traceability Verification**
1. Create a system requirement
2. Link two test cases to the requirement
3. Create and execute a test run with these test cases
4. Navigate from requirement to test results
5. Navigate from test results back to requirement
6. Verify all links are bidirectional and accurate

**Expected Result:** Complete traceability chain is maintained and navigable in both directions.

**Test Case 3: Step-by-Step Execution**
1. Start executing a test case with 5 steps
2. Complete 3 steps and navigate away
3. Return to the test case execution
4. Verify the first 3 steps retain their results
5. Complete remaining steps
6. Verify test case result is correctly calculated

**Expected Result:** Progress is saved incrementally and results are calculated correctly based on all step outcomes.