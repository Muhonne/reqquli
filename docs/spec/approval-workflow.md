## 1. Feature Overview

**Feature Name:** Approval and Draft Status Workflow

**Feature Description:** A unified approval workflow system that applies to multiple item types (User Requirements, System Requirements, Risk Records, Test Cases) with consistent behavior for creating, editing, saving, approving, and canceling operations. Items can exist in two states: "draft" (editable, unapproved) or "approved" (locked, requires password to edit). The system supports three primary operations: Save (draft), Approve (approved), and Save & Approve (approved in one action).

**Goal:** Provide a consistent, auditable approval workflow across all requirement and risk management items, ensuring that approved items require explicit authorization to modify, and that all changes are properly tracked through revision numbers and status transitions.

---

## 2. Functional Requirements (User Behaviors)

This section uses Gherkin syntax to describe the feature's behavior from the user's perspective. Each scenario acts as a clear, testable requirement.

```gherkin
Feature: Approval and Draft Status Workflow

# ============================================
# CREATION SCENARIOS
# ============================================

Scenario: Create New Item in Draft Status
  Given I am a logged-in user
  When I navigate to create a new item (User Requirement, System Requirement, Risk Record, or Test Case)
  And I fill in the required fields (title, description, etc.)
  And I click "Save"
  Then a new item is created with status "draft"
  And the creation timestamp and creator are recorded
  And the item has revision number "0"
  And the item can be edited without password confirmation
  And the item can be approved later

Scenario: Create New Item and Approve Immediately
  Given I am a logged-in user
  When I navigate to create a new item
  And I fill in the required fields
  And I click "Save & Approve"
  And I confirm with my password
  Then a new item is created with status "approved"
  And the item has revision number "1"
  And the item requires password to edit
  And the approval timestamp and approver are recorded

# ============================================
# DRAFT ITEM SCENARIOS
# ============================================

Scenario: Edit Draft Item and Save
  Given I am a logged-in user
  And there is a draft item "ITEM-1" with status "draft" and revision "0"
  When I navigate to the item details page
  And I click "Edit"
  Then the "Save" button is disabled
  And I modify the item content
  Then the "Save" button is enabled
  And I click "Save"
  Then the item status remains "draft"
  And the revision number remains "0" (revision only increments on approval)
  And the changes are saved
  And the item can be edited again without password

Scenario: Edit Draft Item and Approve
  Given I am a logged-in user
  And there is a draft item "ITEM-1" with status "draft" and revision "0"
  When I navigate to the item details page
  And I click "Edit"
  Then the "Save" button is disabled
  And I modify the item content
  Then the "Save" button is enabled
  And I click "Save & Approve"
  And I confirm with my password
  Then the item status changes to "approved"
  And the revision number increments to "1"
  And the approval timestamp and approver are recorded
  And the item now requires password to edit

Scenario: Edit Draft Item and Cancel
  Given I am a logged-in user
  And there is a draft item "ITEM-1" with status "draft" and revision "0"
  When I navigate to the item details page
  And I click "Edit"
  Then the "Save" button is disabled
  And I modify the item content
  Then the "Save" button is enabled
  And I click "Cancel"
  Then the item status remains "draft"
  And the revision number remains "0"
  And the changes are discarded (not saved)
  And the item returns to its previous state before editing

Scenario: Approve Draft Item Without Editing
  Given I am a logged-in user
  And there is a draft item "ITEM-1" with status "draft" and revision "0"
  When I navigate to the item details page
  And I click "Approve"
  And I confirm with my password
  Then the item status changes to "approved"
  And the revision number increments to "1"
  And the approval timestamp and approver are recorded
  And the item content remains unchanged

# ============================================
# APPROVED ITEM SCENARIOS - EDITING
# ============================================

Scenario: Start Editing Approved Item (Password Confirmation)
  Given I am a logged-in user
  And there is an approved item "ITEM-1" with status "approved" and revision "1"
  When I navigate to the item details page
  And I click "Edit"
  Then I am prompted to confirm with my password
  And after entering the correct password
  Then the item status immediately changes to "draft"
  And the approval timestamp and approver are cleared (set to null)
  And the revision number remains "1" (unchanged)
  And I enter edit mode
  And I can modify the item content

Scenario: Edit Approved Item, Save Changes (Draft Status)
  Given I am a logged-in user
  And there is an approved item "ITEM-1" with status "approved" and revision "1"
  When I navigate to the item details page
  And I click "Edit"
  And I confirm with my password (item status changes to "draft")
  And I modify the item content
  And I click "Save"
  Then the item status remains "draft"
  And the revision number remains "1" (unchanged)
  And the changes are saved
  And the item can be edited again without password
  And the item can be re-approved later

Scenario: Edit Approved Item, Save & Approve
  Given I am a logged-in user
  And there is an approved item "ITEM-1" with status "approved" and revision "1"
  When I navigate to the item details page
  And I click "Edit"
  And I confirm with my password (item status changes to "draft")
  And I modify the item content
  And I click "Save & Approve"
  And I confirm with my password again
  Then the item status changes to "approved"
  And the revision number increments to "2"
  And the approval timestamp and approver are recorded
  And the changes are saved
  And the item now requires password to edit again

Scenario: Edit Approved Item, Cancel Without Saving
  Given I am a logged-in user
  And there is an approved item "ITEM-1" with status "approved" and revision "1"
  When I navigate to the item details page
  And I click "Edit"
  And I confirm with my password (item status changes to "draft")
  And I modify the item content
  And I click "Cancel"
  Then the item status remains "draft" (NOT reverted to "approved")
  And the revision number remains "1" (unchanged)
  And the unsaved changes are discarded
  And the item content returns to its state before editing
  And the item can be edited again without password
  And the item can be re-approved later

Scenario: Edit Approved Item, Make No Changes, Cancel
  Given I am a logged-in user
  And there is an approved item "ITEM-1" with status "approved" and revision "1"
  When I navigate to the item details page
  And I click "Edit"
  And I confirm with my password (item status changes to "draft")
  And I do not modify any content
  And I click "Cancel"
  Then the item status remains "draft" (NOT reverted to "approved")
  And the revision number remains "1" (unchanged)
  And the item content remains unchanged
  And the item can be edited again without password
  And the item can be re-approved later

# ============================================
# RE-APPROVAL SCENARIOS
# ============================================

Scenario: Re-approve Previously Approved Item That Was Edited
  Given I am a logged-in user
  And there is a draft item "ITEM-1" that was previously approved (status "draft", revision "1")
  When I navigate to the item details page
  And I click "Approve"
  And I confirm with my password
  Then the item status changes to "approved"
  And the revision number increments to "2"
  And the approval timestamp and approver are recorded
  And the item now requires password to edit again

# ============================================
# EDGE CASES AND VALIDATION
# ============================================

Scenario: Attempt to Edit Approved Item Without Password
  Given I am a logged-in user
  And there is an approved item "ITEM-1" with status "approved"
  When I navigate to the item details page
  And I click "Edit"
  Then I am prompted to confirm with my password
  And if I cancel the password prompt
  Then the item status remains "approved"
  And the revision number remains unchanged
  And I do not enter edit mode
  And no changes are made to the item

Scenario: Save Draft Item Without Changes
  Given I am a logged-in user
  And there is a draft item "ITEM-1" with status "draft" and revision "0"
  When I navigate to the item details page
  And I click "Edit"
  And I do not modify any content
  Then the "Save" button is disabled
  And I click "Cancel"
  Then the item status remains "draft"
  And the revision number remains "0"
  And no error occurs
  And the item remains editable

Scenario: Multiple Edit Cycles on Approved Item
  Given I am a logged-in user
  And there is an approved item "ITEM-1" with status "approved" and revision "1"
  When I edit and save the item (status becomes "draft", revision "1")
  And I edit and save again (status remains "draft", revision "1")
  And I approve the item (status becomes "approved", revision "2")
  And I edit and save again (status becomes "draft", revision "2")
  Then the item can be edited without password
  And the revision number remains "2" until next approval
```

---

## 3. Technical Requirements

This section details the engineering work for each Gherkin scenario. The approval workflow applies consistently across User Requirements, System Requirements, Risk Records, and Test Cases.

### 3.1 Status and Revision Rules

**Status Values:**
- `draft`: Item is editable without password confirmation. Can be approved.
- `approved`: Item requires password confirmation to edit. Editing immediately resets to `draft`.

**Revision Number Rules:**
- Revision starts at `0` for new items
- Revision increments **only** when an item is approved (via "Approve" or "Save & Approve")
- Revision **never** increments on save operations
- Revision **never** increments when entering edit mode
- Revision **never** increments when canceling edits

**Status Transition Rules:**
- New items: Always created as `draft` with revision `0`
- Draft → Approved: Via "Approve" or "Save & Approve" action, increments revision
- Approved → Draft: Automatically when entering edit mode (after password confirmation)
- Draft → Draft: Remains draft on save operations
- **Critical**: Once an approved item enters edit mode (after password confirmation), it becomes `draft` and **does not automatically revert to `approved`** if the user cancels

### 3.2 Backend Functionality

**Update Endpoint Behavior (`PATCH /api/{items}/:id`):**

1. **Editing Approved Items:**
   - When updating an approved item without `status: 'approved'` in the request:
     - Status is automatically reset to `draft`
     - `approved_at` is set to `null`
     - `approved_by` is set to `null`
     - Revision number remains unchanged
   - Password validation is required when editing approved items

2. **Save Operation (Draft):**
   - If item is draft or becomes draft: Status remains `draft`, revision unchanged
   - Updates `last_modified` and `modified_by` timestamps

3. **Save & Approve Operation:**
   - If `status: 'approved'` is provided in update request:
     - Status is set to `approved`
     - Revision increments (if current revision is 0, becomes 1; otherwise increments by 1)
     - Sets `approved_at` and `approved_by` timestamps
     - Requires password validation

**Approve Endpoint Behavior (`POST /api/{items}/:id/approve`):**

- Changes status from `draft` to `approved`
- Increments revision number
- Sets `approved_at` and `approved_by` timestamps
- Requires password validation
- Records optional `approval_notes`

**Password Validation:**
- Required when:
  - Editing an approved item
  - Approving an item (via "Approve" or "Save & Approve")
  - Deleting an approved item
- Password is validated against the current user's password hash
- Invalid password returns 401 Unauthorized

### 3.3 Frontend Functionality

**Edit Mode Entry:**

1. **Draft Items:**
   - Clicking "Edit" immediately enters edit mode
   - No password confirmation required

2. **Approved Items:**
   - Clicking "Edit" shows password confirmation modal
   - After successful password confirmation:
     - Makes API call to update item (which resets to draft)
     - Enters edit mode
     - Item is now in `draft` status

**Save Operations:**

1. **Save (Draft):**
   - Updates item via `PATCH /api/{items}/:id`
   - Does not include `status: 'approved'` in request
   - Item remains in `draft` status
   - Revision unchanged

2. **Save & Approve:**
   - Shows password confirmation modal
   - After password confirmation:
     - Updates item via `PATCH /api/{items}/:id` with `status: 'approved'`
     - Or uses dedicated approve endpoint after update
   - Item becomes `approved`
   - Revision increments

**Cancel Operation:**

- Exits edit mode without saving
- **Critical Behavior**: Does NOT revert status back to `approved` if item was previously approved
- Discards unsaved form changes
- Item remains in current status (likely `draft` if it was approved before editing)

**UI State Management:**

- Form fields are initialized from current item state when entering edit mode
- Form maintains local state for unsaved changes
- Cancel discards local form state and exits edit mode
- Save commits local form state to backend

### 3.4 Database Design

**Common Fields Across All Item Types:**

- `status` (VARCHAR): 'draft' or 'approved'
- `revision` (INTEGER): Starts at 0, increments only on approval
- `approved_at` (TIMESTAMP): Set on approval, cleared (set to NULL) when approved item is edited
- `approved_by` (UUID, FK to users): Set on approval, cleared (set to NULL) when approved item is edited
- `approval_notes` (TEXT): Optional notes recorded during approval
- `last_modified` (TIMESTAMP): Updated on every save operation
- `modified_by` (UUID, FK to users): Updated on every save operation

**Status Transition Tracking:**

- Audit trail should record:
  - Status changes (draft ↔ approved)
  - Revision increments
  - Approval events (timestamp, user, notes)
  - Edit events on approved items (password confirmation)

### 3.5 Business Logic Summary

**Key Principles:**

1. **Approval is Explicit**: Items only become approved through explicit "Approve" or "Save & Approve" actions with password confirmation

2. **Editing Approved Items Requires Authorization**: Password confirmation is required to edit approved items, and this action immediately resets status to draft

3. **Revision Tracks Approvals**: Revision numbers reflect the number of times an item has been approved, not the number of times it has been edited

4. **No Automatic Reversion**: Once an approved item enters edit mode and becomes draft, canceling the edit does NOT revert it back to approved status. The item remains in draft and must be explicitly re-approved

5. **Consistent Behavior**: All item types (User Requirements, System Requirements, Risk Records, Test Cases) follow the same approval workflow rules

---

## 4. Manual Verification Protocol

### Test Case 1: Create and Approve New Item
*Maps to "Create New Item in Draft Status" and "Create New Item and Approve Immediately" scenarios*

1. **Step 1:** Login as user
2. **Step 2:** Create a new item (User Requirement, System Requirement, Risk Record, or Test Case)
3. **Step 3:** Fill required fields and click "Save"
4. **Step 4:** Verify item created with status="draft", revision=0
5. **Step 5:** Verify creation timestamp and creator are recorded
6. **Step 6:** Click "Approve" and confirm with password
7. **Step 7:** Verify status="approved", revision=1
8. **Step 8:** Create another new item
9. **Step 9:** Fill required fields and click "Save & Approve"
10. **Step 10:** Confirm with password
11. **Step 11:** Verify item created with status="approved", revision=1
12. **Step 12:** Verify creation timestamp and creator are recorded

**Expected Result:** New items can be created in draft or approved status, with correct revision numbers, and creation metadata is properly recorded.

### Test Case 2: Edit Draft Item
*Maps to "Edit Draft Item and Save", "Edit Draft Item and Approve", and "Edit Draft Item and Cancel" scenarios*

1. **Step 1:** Login as user
2. **Step 2:** Select a draft item (status="draft", revision=0)
3. **Step 3:** Click "Edit"
4. **Step 4:** Verify "Save" button is disabled (no changes made yet)
5. **Step 5:** Modify content
6. **Step 6:** Verify "Save" button is enabled
7. **Step 7:** Click "Save"
8. **Step 8:** Verify status="draft", revision=0 (unchanged)
9. **Step 9:** Click "Edit" again
10. **Step 10:** Verify "Save" button is disabled
11. **Step 11:** Modify content
12. **Step 12:** Verify "Save" button is enabled
13. **Step 13:** Click "Save & Approve"
14. **Step 14:** Confirm with password
15. **Step 15:** Verify status="approved", revision=1
16. **Step 16:** Create another draft item
17. **Step 17:** Click "Edit"
18. **Step 18:** Verify "Save" button is disabled
19. **Step 19:** Modify content
20. **Step 20:** Verify "Save" button is enabled
21. **Step 21:** Click "Cancel"
22. **Step 22:** Verify changes discarded, status="draft", revision=0

**Expected Result:** Draft items can be edited and saved without password, or approved with password. Save button is disabled when no changes are made and enabled after modifications. Cancel discards changes.

### Test Case 3: Edit Approved Item - Save Changes
*Maps to "Start Editing Approved Item", "Edit Approved Item, Save Changes", and "Edit Approved Item, Cancel Without Saving" scenarios*

1. **Step 1:** Login as user
2. **Step 2:** Select an approved item (status="approved", revision=1)
3. **Step 3:** Click "Edit"
4. **Step 4:** Verify password confirmation modal appears
5. **Step 5:** Enter password and confirm
6. **Step 6:** Verify item status immediately changes to "draft" (check API response or UI)
7. **Step 7:** Verify revision remains 1 (unchanged)
8. **Step 8:** Verify "Save" button is disabled (no changes made yet)
9. **Step 9:** Modify content
10. **Step 10:** Verify "Save" button is enabled
11. **Step 11:** Click "Save"
12. **Step 12:** Verify status="draft", revision=1 (unchanged)
13. **Step 13:** Verify item can be edited again without password
14. **Step 14:** Select another approved item (status="approved", revision=1)
15. **Step 15:** Click "Edit", confirm password
16. **Step 16:** Verify "Save" button is disabled
17. **Step 17:** Modify content
18. **Step 18:** Verify "Save" button is enabled
19. **Step 19:** Click "Cancel"
20. **Step 20:** Verify changes discarded
21. **Step 21:** Verify status="draft" (NOT reverted to "approved")
22. **Step 22:** Verify revision=1 (unchanged)
23. **Step 23:** Verify item can be edited again without password

**Expected Result:** Editing approved items requires password, immediately resets to draft, Save button state reflects changes, and cancel does NOT revert to approved status.

### Test Case 4: Edit Approved Item - Save & Approve
*Maps to "Edit Approved Item, Save & Approve" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Select an approved item (status="approved", revision=1)
3. **Step 3:** Click "Edit", confirm password (status becomes "draft")
4. **Step 4:** Verify "Save" button is disabled
5. **Step 5:** Modify content
6. **Step 6:** Verify "Save" button is enabled
7. **Step 7:** Click "Save & Approve"
8. **Step 8:** Confirm with password again
9. **Step 9:** Verify status="approved", revision=2
10. **Step 10:** Verify changes are saved
11. **Step 11:** Verify item requires password to edit again

**Expected Result:** Approved items can be edited and re-approved in one action, with revision increment. Save button state reflects changes.

### Test Case 5: Cancel Without Changes
*Maps to "Edit Approved Item, Make No Changes, Cancel" and "Save Draft Item Without Changes" scenarios*

1. **Step 1:** Login as user
2. **Step 2:** Select an approved item (status="approved", revision=1)
3. **Step 3:** Click "Edit", confirm password (status becomes "draft")
4. **Step 4:** Do NOT modify any content
5. **Step 5:** Verify "Save" button is disabled (no changes made)
6. **Step 6:** Click "Cancel"
7. **Step 7:** Verify status="draft" (NOT reverted to "approved")
8. **Step 8:** Verify revision=1 (unchanged)
9. **Step 9:** Verify content unchanged
10. **Step 10:** Verify item can be edited again without password
11. **Step 11:** Select a draft item (status="draft", revision=0)
12. **Step 12:** Click "Edit"
13. **Step 13:** Do NOT modify any content
14. **Step 14:** Verify "Save" button is disabled
15. **Step 15:** Click "Cancel"
16. **Step 16:** Verify status="draft", revision=0
17. **Step 17:** Verify no error occurs
18. **Step 18:** Verify item remains editable

**Expected Result:** Canceling edit on approved or draft item (even without changes) leaves item in draft status. Save button is disabled when no changes are made.

### Test Case 6: Re-approval Workflow
*Maps to "Re-approve Previously Approved Item That Was Edited" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Select an approved item (status="approved", revision=1)
3. **Step 3:** Edit and save (status becomes "draft", revision=1)
4. **Step 4:** Click "Approve" and confirm with password
5. **Step 5:** Verify status="approved", revision=2
6. **Step 6:** Edit and save again (status becomes "draft", revision=2)
7. **Step 7:** Click "Approve" and confirm with password
8. **Step 8:** Verify status="approved", revision=3

**Expected Result:** Items can go through multiple edit-approve cycles, with revision incrementing on each approval.

### Test Case 7: Password Validation
*Maps to "Attempt to Edit Approved Item Without Password" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Select an approved item (status="approved", revision=1)
3. **Step 3:** Click "Edit"
4. **Step 4:** Verify password confirmation modal appears
5. **Step 5:** Enter incorrect password
6. **Step 6:** Verify error message displayed
7. **Step 7:** Verify item status remains "approved"
8. **Step 8:** Verify revision remains 1
9. **Step 9:** Verify edit mode is NOT entered
10. **Step 10:** Cancel password modal
11. **Step 11:** Verify item status remains "approved"

**Expected Result:** Invalid password prevents editing approved items, and item status remains unchanged.

### Test Case 8: Multiple Edit Cycles
*Maps to "Multiple Edit Cycles on Approved Item" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Select an approved item (status="approved", revision=1)
3. **Step 3:** Edit and save (status="draft", revision=1)
4. **Step 4:** Edit and save again (status="draft", revision=1)
5. **Step 5:** Approve (status="approved", revision=2)
6. **Step 6:** Edit and save (status="draft", revision=2)
7. **Step 7:** Verify revision remains 2 until next approval

**Expected Result:** Multiple edit cycles work correctly, with revision only incrementing on approval.

---

## 5. Implementation Notes

### 5.1 Frontend Implementation Pattern

**Edit Button Handler:**
```typescript
const handleEdit = () => {
  if (item.status === 'approved') {
    setShowPasswordConfirm(true);
  } else {
    setIsEditing(true);
  }
};
```

**Password Confirmation Handler (for approved items):**
```typescript
const handlePasswordConfirm = async (password: string) => {
  // Update item with password - this resets status to draft
  const updated = await actions.updateItem(item.id, {
    ...item,
    password
  });
  setItem(updated); // Now in draft status
  setIsEditing(true);
};
```

**Cancel Handler:**
```typescript
const handleCancel = () => {
  setIsEditing(false);
  // Do NOT revert status - item remains in current status (draft if it was approved)
  // Form state is discarded automatically
};
```

### 5.2 Backend Implementation Pattern

**Update Endpoint Logic:**
```typescript
// Check if item was approved before update
const wasApproved = currentItem.status === 'approved';

// Handle status changes
if (wantsToApprove) {
  // Approving: set status, increment revision, set approval fields
  status = 'approved';
  revision = currentItem.revision === 0 ? 1 : currentItem.revision + 1;
  approved_at = new Date();
  approved_by = req.user.id;
} else if (wasApproved && !status) {
  // Editing approved item without status change: reset to draft
  status = 'draft';
  approved_at = null;
  approved_by = null;
  // Revision remains unchanged
}
```

### 5.3 Common Pitfalls to Avoid

1. **Do NOT revert status on cancel**: Once an approved item becomes draft (after password confirmation), canceling should NOT revert it back to approved.

2. **Do NOT increment revision on save**: Revision only increments on approval, never on save operations.

3. **Do NOT increment revision on edit mode entry**: Revision only increments when status changes to approved, not when entering edit mode.

4. **Password validation timing**: Password must be validated BEFORE the item status is changed to draft when editing approved items.

5. **Consistent behavior**: All item types must follow the same approval workflow rules.

---

## 6. Related Specifications

This approval workflow applies to:
- User Requirements (see `user-requirements.md`)
- System Requirements (see `system-requirements.md`)
- Risk Records (see `risks.md`)
- Test Cases (referenced in `manual-test-runs.md`)

Each of these item types implements the same approval workflow described in this specification.

