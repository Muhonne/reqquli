## 1. Feature Overview

**Feature Name:** Item List Component

**Feature Description:** A reusable list component that provides consistent browsing, searching, sorting, filtering, and pagination functionality across multiple item types (User Requirements, System Requirements, Risk Records, Test Cases, Test Runs). The component displays items in a standardized list format with shared controls for navigation and data manipulation.

**Goal:** Provide a unified, consistent user experience for browsing and finding items across all item types, with shared search, sort, filter, and pagination capabilities.

**Note:** This component is used by User Requirements, System Requirements, Risk Records, Test Cases, and Test Runs. Each item type may have type-specific fields displayed, but the core list functionality (search, sort, filter, pagination) is consistent.

---

## 2. Functional Requirements (User Behaviors)

This section uses Gherkin syntax to describe the feature's behavior from the user's perspective. Each scenario acts as a clear, testable requirement.

```gherkin
Feature: Item List Browsing and Navigation

Scenario: View Item List
  Given I am a logged-in user
  When I navigate to an item list page (User Requirements, System Requirements, Risks, Test Cases, or Test Runs)
  Then I see a list of all items of that type
  And each item displays its ID, title, and relevant metadata
  And I see a "Create New" button or link
  And I can click on any item to view its details

Scenario: Search Items
  Given I am viewing an item list
  When I enter text in the search field
  Then the list filters to show only items matching the search text
  And the search matches against item title and description
  And the search updates in real-time as I type
  And I can clear the search to show all items again

Scenario: Sort Items
  Given I am viewing an item list
  When I select a sort option from the sort dropdown
  Then the list is reordered according to the selected sort option
  And I can sort by "Last Modified" (default)
  And I can sort by "Created Date"
  And I can sort by "Approved Date" (if applicable)
  And I can toggle between ascending and descending order
  And the sort indicator shows the current sort option and direction

Scenario: Filter Items by Status
  Given I am viewing an item list
  When I select a status from the status filter dropdown
  Then the list filters to show only items with that status
  And I can filter by "All" to show all items
  And I can filter by "Draft" to show only draft items
  And I can filter by "Approved" to show only approved items
  And the filter updates the list immediately

Scenario: Navigate Through Paginated Results
  Given I am viewing an item list with more items than fit on one page
  When I see pagination controls showing current page and total pages
  And I can click "Next" to go to the next page
  And I can click "Previous" to go to the previous page
  And I can click on a specific page number to jump to that page
  Then the list updates to show items for the selected page
  And the pagination controls reflect the current page
  And the total count of items is displayed

Scenario: Combine Search, Sort, and Filter
  Given I am viewing an item list
  When I apply a search query
  And I apply a status filter
  And I apply a sort option
  Then all filters are applied together
  And the results reflect the combination of all filters
  And pagination is calculated based on the filtered results
  And I can clear individual filters without affecting others

Scenario: Select Item from List
  Given I am viewing an item list
  When I click on an item in the list
  Then the item is highlighted as selected
  And the item details are displayed in the detail panel (if in split view)
  Or I navigate to the item detail page (if in single view)
  And the selected item remains highlighted in the list
```

---

## 3. Technical Requirements

This section details the engineering work for each Gherkin scenario.

### 3.1 Component Structure

**ItemList Component:**
- Generic component that accepts items of any supported type
- Displays items in a standardized list format
- Accepts custom filter controls as children/props
- Handles item selection and navigation
- Supports loading states and empty states

**ItemListControls Component:**
- Provides search input field
- Provides status filter dropdown
- Provides sort dropdown with order toggle
- Provides pagination controls
- Displays total count of items
- Handles all filter state changes

### 3.2 Backend Functionality

**List Endpoints:**
All item types implement list endpoints with consistent query parameters:
- `GET /api/{items}` - List all items with query parameters:
  - `search` (string, optional): Search term for filtering by title/description
  - `status` (string, optional): Filter by status (draft, approved, etc.)
  - `sort` (string, optional): Sort field (lastModified, createdAt, approvedAt, id, title)
  - `order` (string, optional): Sort order (asc, desc)
  - `page` (number, optional): Page number for pagination
  - `limit` (number, optional): Items per page (default: 50)

**Response Format:**
All list endpoints return consistent pagination structure:
```json
{
  "success": true,
  "items": [...],
  "pagination": {
    "page": 1,
    "pages": 5,
    "total": 250,
    "limit": 50
  }
}
```

**Search Implementation:**
- Search applies to item title and description fields
- Case-insensitive matching
- Partial matching (contains, not exact match)
- Searches across all items regardless of status (unless status filter is also applied)

**Sort Implementation:**
- Default sort: `lastModified` descending (newest first)
- Available sort options:
  - `lastModified` - Last modification date
  - `createdAt` - Creation date
  - `approvedAt` - Approval date (if applicable)
  - `id` - Item ID (alphanumeric)
  - `title` - Item title (alphabetical)
- Sort order can be toggled between ascending and descending

**Filter Implementation:**
- Status filter: Filters items by approval status (draft, approved)
- Filters are applied server-side for performance
- Multiple filters can be combined (search + status + sort)

**Pagination Implementation:**
- Default page size: 50 items per page
- Pagination calculated based on filtered results
- Page numbers are 1-indexed
- Total count reflects filtered results, not all items

### 3.3 Frontend Functionality

**UI Components:**
- **ItemList:** Main list component displaying items
- **ItemListControls:** Filter and pagination controls
- **ListItem:** Individual item row component (customized per item type)

**State Management:**
- Filter state managed in parent component (page component)
- Filter changes trigger API calls to fetch filtered results
- URL parameters can optionally reflect current filters for bookmarking

**User Experience:**
- Real-time search as user types (with debouncing)
- Immediate filter updates
- Loading indicators during data fetching
- Empty state messages when no items match filters
- Clear visual indication of selected item
- Responsive design for different screen sizes

### 3.4 Database Design

**Common Indexes Required:**
All item tables should have indexes to support efficient list queries:
- Composite: `(status, last_modified)` for status filtering with date sorting
- Composite: `(status, created_at)` for status filtering with creation date sorting
- Composite: `(status, approved_at)` for status filtering with approval date sorting
- Composite: `(deleted_at, status)` for soft delete filtering
- Full-text search indexes on title and description fields (if supported)

**Query Optimization:**
- Use LIMIT and OFFSET for pagination
- Count queries should use filtered conditions
- Indexes should support common filter + sort combinations

---

## 4. Manual Verification Protocol

### Test Case 1: Basic List Display
*Maps to "View Item List" scenario*

1. **Step 1:** Login as user
2. **Step 2:** Navigate to any item list page (User Requirements, System Requirements, Risks, etc.)
3. **Step 3:** Verify list displays with proper columns (ID, title, dates)
4. **Step 4:** Verify "Create New" button is visible and functional
5. **Step 5:** Click on an item
6. **Step 6:** Verify item is selected and details are displayed

**Expected Result:** List displays correctly with all items visible and selection works properly.

### Test Case 2: Search Functionality
*Maps to "Search Items" scenario*

1. **Step 1:** Navigate to an item list with multiple items
2. **Step 2:** Enter a search term in the search field
3. **Step 3:** Verify list filters to show only matching items
4. **Step 4:** Verify search matches title and description
5. **Step 5:** Clear the search
6. **Step 6:** Verify all items are shown again

**Expected Result:** Search filters items correctly and can be cleared.

### Test Case 3: Sort Functionality
*Maps to "Sort Items" scenario*

1. **Step 1:** Navigate to an item list
2. **Step 2:** Select "Created Date" from sort dropdown
3. **Step 3:** Verify list is sorted by creation date
4. **Step 4:** Toggle sort order to descending
5. **Step 5:** Verify list is re-sorted in descending order
6. **Step 6:** Select "Last Modified" sort option
7. **Step 7:** Verify list is sorted by last modified date

**Expected Result:** Sorting works correctly for all sort options and order can be toggled.

### Test Case 4: Status Filter
*Maps to "Filter Items by Status" scenario*

1. **Step 1:** Navigate to an item list
2. **Step 2:** Select "Draft" from status filter
3. **Step 3:** Verify only draft items are shown
4. **Step 4:** Select "Approved" from status filter
5. **Step 5:** Verify only approved items are shown
6. **Step 6:** Select "All" from status filter
7. **Step 7:** Verify all items are shown

**Expected Result:** Status filter works correctly and can be cleared.

### Test Case 5: Pagination
*Maps to "Navigate Through Paginated Results" scenario*

1. **Step 1:** Navigate to an item list with more than 50 items
2. **Step 2:** Verify pagination controls are displayed
3. **Step 3:** Verify total count and page numbers are shown
4. **Step 4:** Click "Next" page
5. **Step 5:** Verify list updates to show next page of items
6. **Step 6:** Click on a specific page number
7. **Step 7:** Verify list jumps to that page
8. **Step 8:** Click "Previous" page
9. **Step 9:** Verify list goes back to previous page

**Expected Result:** Pagination works correctly and reflects current page state.

### Test Case 6: Combined Filters
*Maps to "Combine Search, Sort, and Filter" scenario*

1. **Step 1:** Navigate to an item list
2. **Step 2:** Enter a search term
3. **Step 3:** Apply status filter "Draft"
4. **Step 4:** Apply sort "Created Date" descending
5. **Step 5:** Verify results match all applied filters
6. **Step 6:** Clear search only
7. **Step 7:** Verify status filter and sort remain applied
8. **Step 8:** Clear status filter
9. **Step 9:** Verify sort remains applied

**Expected Result:** Multiple filters can be combined and cleared independently.

---

## 5. Implementation Notes

### 5.1 Component Usage Pattern

**ItemList Component:**
```typescript
<ItemList
  items={items}
  onSelectItem={handleSelectItem}
  onCreateNew={handleCreateNew}
  loading={loading}
  selectedId={selectedId}
  sortBy={filters.sort}
  title="Item Type Name"
  itemType="user" | "system" | "risk" | "test" | "testrun"
  totalCount={pagination.total}
  filters={
    <ItemListControls
      search={filters.search}
      status={filters.status}
      onSearchChange={handleSearchChange}
      onStatusChange={handleStatusChange}
      sortBy={filters.sort}
      sortOrder={filters.order}
      onSortChange={handleSortChange}
      currentPage={pagination.page}
      totalPages={pagination.pages}
      onPageChange={handlePageChange}
    />
  }
/>
```

### 5.2 Filter State Management

**Filter State Structure:**
```typescript
interface ItemFilters {
  search?: string;
  status?: 'draft' | 'approved';
  sort?: 'lastModified' | 'createdAt' | 'approvedAt' | 'id' | 'title';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

**Filter Change Handlers:**
- Search: Debounced input (300ms delay) to avoid excessive API calls
- Status: Immediate filter application
- Sort: Immediate re-sort with page reset to 1
- Pagination: Direct page navigation

### 5.3 API Integration

**Consistent Query Parameters:**
All list endpoints should accept the same query parameter structure:
- `?search=term&status=draft&sort=createdAt&order=desc&page=1&limit=50`

**Response Handling:**
- Extract items array from response
- Extract pagination metadata
- Update filter state with current query parameters
- Handle loading and error states

---

## 6. Related Specifications

This ItemList functionality is used by:
- User Requirements (see `user-requirements.md`)
- System Requirements (see `system-requirements.md`)
- Risk Records (see `risks.md`)
- Test Cases (referenced in `manual-test-runs.md`)
- Test Runs (referenced in `manual-test-runs.md`)

Each of these item types uses the ItemList component with type-specific customizations for item display, but shares the core search, sort, filter, and pagination functionality described in this specification.

