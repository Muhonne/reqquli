# API Test Coverage Gap Analysis

## Summary
Based on review of OpenAPI specs and test files, here's the comprehensive gap analysis:

## Implemented Endpoints

### Authentication (/api/auth)
- ✅ POST /register - TESTED
- ✅ GET /verify-email/:token - TESTED  
- ✅ POST /resend-verification - TESTED
- ✅ POST /login - TESTED
- ✅ POST /refresh - TESTED
- ✅ POST /logout - TESTED
- ✅ GET /approvers - TESTED

### User Requirements (/api/user-requirements)
- ✅ GET / (list with filters) - TESTED
- ✅ GET /:id - TESTED
- ✅ POST / (create) - TESTED
- ✅ PATCH /:id - TESTED
- ✅ POST /:id/approve - TESTED
- ✅ DELETE /:id - TESTED
- ✅ GET /:id/downstream-traces - TESTED (in traces.test.ts)

### System Requirements (/api/system-requirements)  
- ✅ GET / (list with filters) - TESTED
- ✅ GET /:id - TESTED
- ✅ POST / (create) - TESTED
- ✅ PATCH /:id - TESTED
- ✅ POST /:id/approve - TESTED
- ✅ DELETE /:id - TESTED
- ✅ GET /trace-from/:userRequirementId - TESTED

### Traces (/api/traces)
- ✅ GET /traces - TESTED
- ✅ GET /requirements/:id/traces - TESTED
- ✅ POST /traces - TESTED
- ✅ DELETE /traces/:fromId/:toId - TESTED

### Test Cases (/api/test-cases)
- ✅ GET /:id - TESTED
- ✅ POST / (create) - TESTED
- ✅ PATCH /:id - TESTED
- ✅ PUT /:id/approve - TESTED
- ✅ DELETE /:id - TESTED
- ✅ GET /:id/traces - TESTED
- ✅ GET /:id/results - TESTED

### Test Runs (/api/test-runs)
- ✅ GET / (list) - TESTED
- ✅ POST / (create) - TESTED
- ✅ GET /:runId - TESTED
- ✅ PUT /:runId/approve - TESTED
- ✅ POST /:runId/test-cases/:testCaseId/execute - TESTED
- ✅ PUT /:runId/test-cases/:testCaseId/steps/:stepNumber - TESTED
- ⚠️ POST /:runId/test-cases/:testCaseId/steps/:stepNumber/upload - NOT TESTED (marked as manual)
- ✅ GET /test-cases (list) - TESTED
- ✅ GET /requirements/:reqId/test-coverage - TESTED

### Evidence
- ⚠️ GET /evidence/:fileId - NOT TESTED (marked as manual in evidence.test.ts)

### Audit (/api/audit)
- ✅ GET /events - TESTED
- ✅ GET /events/aggregate/:type/:id - TESTED
- ✅ GET /events/user/:userId - TESTED
- ✅ POST /events/log - TESTED
- ✅ GET /activity/users - TESTED
- ✅ GET /metrics/system - TESTED
- ✅ GET /timeline - TESTED

### System
- ✅ GET /api/health - Tested manually

## Gaps Identified

### 1. Missing from OpenAPI Spec but Implemented
- DELETE /api/traces/:fromId/:toId (implemented and tested, not in spec)
- GET /api/audit/* endpoints (all audit endpoints missing from main api.yaml)
- GET /api/user-requirements/:id/downstream-traces (implemented, not in spec)

### 2. File Upload Testing
- POST /api/test-runs/:runId/test-cases/:testCaseId/steps/:stepNumber/upload
- GET /api/evidence/:fileId
- These require multipart form data testing and file handling

### 3. Missing Test Coverage Areas
- Error handling for malformed JSON bodies
- Rate limiting behavior (if implemented)
- CORS validation
- Cookie security testing
- Large payload rejection (>1MB limit)

### 4. Missing OpenAPI Documentation
The following need to be added to api.yaml:
- All audit endpoints
- Test case individual endpoints (GET, PATCH, DELETE for /test-cases/:id)
- Missing trace deletion endpoint

## Recommendations

1. **Add Missing OpenAPI Documentation**
   - Include audit endpoints in api.yaml
   - Add missing test case CRUD operations
   - Document trace deletion endpoint

2. **Add File Upload Tests**
   - Create integration tests for evidence upload
   - Test file size limits
   - Test invalid file types
   - Test file retrieval

3. **Add Security Tests**
   - Test JWT expiration
   - Test invalid tokens
   - Test CORS headers
   - Test rate limiting (when implemented)

4. **Add Edge Case Tests**
   - Malformed request bodies
   - Missing required fields
   - Invalid data types
   - Boundary value testing

5. **Add Performance Tests**
   - Pagination limits
   - Query performance with large datasets
   - Concurrent request handling
