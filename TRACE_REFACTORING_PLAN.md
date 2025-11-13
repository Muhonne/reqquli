# Trace Refactoring Plan: Remove Source Types, Simplify to ID-to-ID

## Goal
Remove `from_type` and `to_type` columns from traces table and simplify trace relationships to simple ID-to-ID connections. Retain direction (from/to) but determine types dynamically from ID prefixes.

## Current State
- Database: `traces` table has `from_type` and `to_type` columns
- Backend: Queries use types to join different tables
- Frontend: Uses types to determine which API to call
- System requirements can only trace from user requirements (upstream)

## Target State
- Database: `traces` table only has `from_requirement_id` and `to_requirement_id`
- Backend: Determines type from ID prefix (UR-, SR-, RISK-, TC-, TRES-)
- Frontend: Can query any item by ID without knowing type
- System requirements can trace from both user requirements AND risks

## ID Prefix Mapping
- `UR-*` → user requirement
- `SR-*` → system requirement  
- `RISK-*` → risk record
- `TC-*` → test case
- `TRES-*` → test result

---

## Step-by-Step Implementation Plan

### Phase 1: Create Utility Functions
**Goal:** Create reusable functions to determine type from ID and get table name

1. **Create `src/server/utils/traceUtils.ts`**
   - `getRequirementType(id: string): 'user' | 'system' | 'testcase' | 'testresult' | 'risk'`
   - `getTableName(type: string): string` - Maps type to database table
   - `validateRequirementExists(pool, id: string): Promise<boolean>` - Checks if requirement exists by trying all tables

### Phase 2: Database Schema Update
**Goal:** Remove type columns from database schema

2. **Update `scripts/database-setup.sql`**
   - Remove `from_type` and `to_type` columns from CREATE TABLE traces
   - Update UNIQUE constraint from `(from_requirement_id, to_requirement_id, from_type, to_type)` to `(from_requirement_id, to_requirement_id)`
   - Remove CHECK constraints on types

### Phase 3: Backend API Updates
**Goal:** Update all trace endpoints to work without stored types

4. **Update `src/server/routes/traces.ts`**
   - **GET /traces**: Update query to determine types from IDs, join all possible tables
   - **GET /requirements/:id/traces**: 
     - Determine requirement type from ID prefix
     - Update upstream/downstream queries to determine types from IDs dynamically
     - Remove type parameters from WHERE clauses
   - **POST /traces**: 
     - Remove `fromType` and `toType` from request body
     - Determine types from `fromId` and `toId` prefixes
     - Update validation to check existence using utility functions
     - Update INSERT to only use `from_requirement_id` and `to_requirement_id`
   - **DELETE /traces/:fromId/:toId**: 
     - Remove type determination logic (already exists)
     - Update DELETE query to remove type conditions

5. **Update Type Definitions**
   - **`src/types/traces.ts`**:
     - Remove `fromType` and `toType` from `TraceRelationship`
     - Remove `fromType` and `toType` from `CreateTraceRequest`
     - Keep `type` in `RequirementTrace` (determined from ID when needed)

### Phase 4: Frontend API Client Updates
**Goal:** Update API calls to not send types

6. **Update `src/client/services/api.ts`**
   - **tracesApi.createTrace**: Remove `fromType` and `toType` parameters
   - Update interface to only require `fromId` and `toId`

### Phase 5: Frontend Component Updates
**Goal:** Update components to work without explicit types

7. **Update `src/client/components/molecules/TraceEditModal.tsx`**
   - Remove `sourceType` from `DirectionConfig`
   - Simplify `TRACE_CONFIGS`:
     - Remove `getTraceConfig` function (no longer needs types)
     - Update `upstream`/`downstream` to only specify which APIs to use for loading items
     - Add support for system requirements tracing from risks (add risk to upstream sources)
   - Update `handleAddTrace` to only send `fromId` and `toId`
   - Update `loadItemsForDirection` to handle multiple source types (user + risk for system upstream)

8. **Update `src/client/components/organisms/RequirementForm.tsx`**
   - Remove type-specific logic from trace handling
   - Update trace display to determine types from IDs if needed

9. **Update `src/client/components/organisms/RiskForm.tsx`**
   - Remove type-specific logic from trace handling

10. **Update `src/client/components/organisms/TestCaseForm.tsx`**
    - Remove type-specific logic from trace handling

11. **Update `src/client/components/pages/TraceabilityPage.tsx`**
    - Update to determine types from IDs dynamically
    - Remove type-based filtering logic

12. **Update `src/client/components/molecules/TraceLink.tsx`**
    - Update to determine type from ID if needed, or accept optional type

### Phase 6: Testing & Validation
**Goal:** Ensure all functionality works correctly

13. **Update Tests**
    - Update `tests/traces.test.ts` (if exists) to not expect types
    - Update E2E tests that interact with traces
    - Verify system requirements can trace from risks

14. **Manual Testing Checklist**
    - [ ] Create trace from user requirement to system requirement
    - [ ] Create trace from risk to system requirement
    - [ ] Create trace from system requirement to test case
    - [ ] View upstream traces for system requirement (should show both UR and RISK)
    - [ ] View downstream traces
    - [ ] Delete traces
    - [ ] Verify traceability page still works

### Phase 7: Documentation Updates
**Goal:** Update documentation to reflect new structure

15. **Update `docs/spec/trace_editing.md`**
    - Document that types are determined from ID prefixes
    - Update database schema documentation

16. **Update `docs/openapi/traces.yaml`**
    - Remove `fromType` and `toType` from request/response schemas
    - Update examples

17. **Update `README.md`**
    - Document ID prefix mapping
    - Update trace relationship documentation

---

## Key Implementation Details

### Backend Query Strategy
Since we can't use types in WHERE clauses, we need to:
1. Query traces table with just IDs
2. For each trace, determine type from ID prefix
3. Join appropriate tables based on determined type
4. Use UNION or conditional joins to handle multiple types

### Frontend Strategy
- When loading items for trace selection, can query multiple APIs and combine results
- When displaying traces, determine type from ID to show appropriate icon/badge
- TraceEditModal can show items from multiple sources (e.g., user requirements + risks for system upstream)

### Migration Considerations
- Existing traces will need type information preserved during migration
- Consider creating a backup before migration
- Migration should be reversible (keep type columns temporarily, then drop after validation)

---

## Benefits
1. **Simpler schema**: Fewer columns, simpler constraints
2. **More flexible**: Can add new requirement types without schema changes
3. **Type safety**: Types determined from IDs (single source of truth)
4. **Easier maintenance**: Less code duplication around type handling
5. **Better support**: System requirements can trace from risks as requested

---

## Risks & Mitigation
- **Risk**: Breaking existing traces during migration
  - **Mitigation**: Test migration on copy of production data first
- **Risk**: Performance impact from dynamic type determination
  - **Mitigation**: Add indexes on ID columns, cache type lookups if needed
- **Risk**: Frontend components break if type determination fails
  - **Mitigation**: Add fallback logic, comprehensive testing

