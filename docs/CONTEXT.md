# Reqquli - Requirement Management System

**Current Status:** Functional MVP with full traceability implementation (UR → SR) and manual test execution capability

## System Overview

Reqquli is a requirements management platform that provides editability, versioning, approvals, and traceability to assist with regulatory compliance. The system delivers comprehensive requirements lifecycle management with full traceability implementation and manual test execution.

## Current Implementation Status
**Features implemented:**
- User authentication with JWT tokens, secure cookies, and email verification workflow
- User registration with password validation and email verification tokens
- Token refresh and secure logout with token blacklisting
- User requirements full CRUD with approval workflow and revision tracking
- System requirements full CRUD with approval workflow and revision tracking
- Bidirectional traceability between requirements via traces junction table
- System requirements full CRUD with bidirectional traceability via traces junction table
- Soft delete for all requirements (deletedAt timestamp)
- Filtering, sorting, pagination, and search for requirements lists
- Sequential ID generation (UR-1, UR-2, SR-1, SR-2 format)
- Protected routes using authenticateToken middleware
- Approvers list endpoint returning verified users
- Password confirmation for approvals and editing approved requirements
- Trace management API for creating and deleting requirement relationships
- Manual test case management with full CRUD operations and approval workflow
- Test run execution with step-by-step tracking and result calculation
- Evidence file upload for test steps with secure storage
- Test coverage traceability from system requirements to test results
- E2E and unit test suites with comprehensive coverage

**Database design:**
- PostgreSQL with connection pooling (pg library)
- UUID support via uuid-ossp extension
- Sequences for requirement numbering (user_requirement_seq, system_requirement_seq)

**Tables implemented:**
- **users:** id (UUID), email, password_hash, full_name, email_verified, created_at, updated_at
- **email_verification_tokens:** id (UUID), user_id, token, expires_at, created_at
- **token_blacklist:** id (UUID), token_jti, user_id, expires_at, blacklisted_at
- **user_requirements:** id (VARCHAR), title, description, status, revision, created_at, created_by, last_modified, modified_by, approved_at, approved_by, approval_notes, deleted_at
- **system_requirements:** id (VARCHAR), title, description, status, revision, created_at, created_by, last_modified, modified_by, approved_at, approved_by, approval_notes, deleted_at
- **traces:** id (UUID), from_requirement_id, to_requirement_id, from_type, to_type, created_at, created_by
- **testing.test_cases:** id (VARCHAR), title, description, status, revision, created_at, created_by, last_modified, modified_by, approved_at, approved_by, deleted_at
- **testing.test_steps:** id (UUID), test_case_id, step_number, action, expected_result
- **testing.test_runs:** id (VARCHAR), name, description, status, overall_result, created_at, created_by, approved_at, approved_by
- **testing.test_run_cases:** id (UUID), test_run_id, test_case_id, status, result, started_at, completed_at, executed_by
- **testing.test_step_results:** id (UUID), test_run_case_id, step_number, expected_result, actual_result, status, evidence_file_id, executed_at, executed_by
- **testing.evidence_files:** id (UUID), file_name, file_path, file_size, mime_type, uploaded_by, uploaded_at, checksum

**Indexes:**
- **users:** idx_users_email (on LOWER(email))
- **email_verification_tokens:** idx_email_verification_tokens_token
- **token_blacklist:** idx_token_blacklist_jti, idx_token_blacklist_expires
- **user_requirements:** idx_user_requirements_status (partial: WHERE deleted_at IS NULL), idx_user_requirements_created_by
- **system_requirements:** idx_system_requirements_status (partial: WHERE deleted_at IS NULL), idx_system_requirements_created_by, idx_sr_status_created, idx_sr_deleted_status, idx_sr_active (partial: WHERE deleted_at IS NULL)
- **traces:** idx_traces_from (composite: from_requirement_id, from_type), idx_traces_to (composite: to_requirement_id, to_type), idx_traces_created_by
- **testing.test_cases:** idx_test_cases_status (partial: WHERE deleted_at IS NULL)
- **testing.test_runs:** idx_test_runs_status, idx_test_runs_created_by
- **testing.test_run_cases:** idx_test_run_cases_test_run, idx_test_run_cases_test_case
- **testing.test_step_results:** idx_test_step_results_run_case
**Database Overview:**

**Authentication Tables:**
- **users:** Core user accounts with email verification status and password management
- **email_verification_tokens:** Time-limited email verification workflow with automatic expiry
- **token_blacklist:** JWT token invalidation for secure logout functionality
- Default user in seed-data is "admin@reqquli.com" with password "salasana!123". This should be used for authentication everywhere.

**requirements Management Tables:**
- **user_requirements:** Business-level requirements with approval workflow and soft delete
- **system_requirements:** Technical requirements with traceability to user requirements and approval workflow

**Key Design Principles:**
- Sequential ID generation for requirements (UR-1, UR-2, SR-1, SR-2 format)
- Soft delete implementation across all requirement tables (deletedAt timestamps)
- Revision tracking with approval workflow (revision increments only on approval)
- Foreign key relationships for traceability and user tracking

**Detailed schema specifications available in feature-specific documentation:**
- Authentication: spec/gherks/authentication.md
- User requirements: spec/gherks/user-requirements.md
- System requirements: spec/gherks/system-requirements.md
- requirements Traceability Management: spec/gherks/trace_editing.md
- Manual Test Runs: spec/gherks/manual-test-runs.md

**Traceability:**
- **Implementation:** Many-to-many trace relationships via traces junction table
- **Direction:** Bidirectional tracing enabling full upstream and downstream traceability
- **Supported Types:** user ↔ system, system ↔ testcase, user ↔ testcase
- **Database Structure:**
  - **traces table:** Unified junction table for ALL trace relationships
    - from_requirement_id: Source requirement/test case ID
    - to_requirement_id: Target requirement/test case ID
    - from_type: Type of source ('user', 'system', 'testcase')
    - to_type: Type of target ('user', 'system', 'testcase')
    - created_at, created_by: Audit fields
  - No direct foreign keys in requirement tables - all relationships via junction table
  - Supports complex traceability chains and multiple relationship types
  - Replaces the deprecated requirement_test_links table
- **API Behavior:**
  - Dedicated traces API (/api/traces, /api/requirements/:id/traces) for relationship management
  - Create/delete trace relationships via traces endpoints
  - GET endpoints query junction table for both upstream and downstream trace data
  - Relationships retrieved dynamically from junction table
- **Frontend Display:**
  - Advanced TraceEditModal with search, add/remove functionality for managing relationships
  - Upstream Traces section shows requirements that trace TO current requirement
  - Downstream Traces section shows requirements that trace FROM current requirement
  - TraceLinksSection component displays trace relationships with navigation
- **Business Rules:**
  - Many-to-many relationships: requirements can have multiple upstream and downstream traces
  - Traceability preserved through soft delete (deleted_at timestamps on requirements)
  - Trace relationships can be modified regardless of requirement approval status
  - Orphaned requirements are permitted and tracked
  - Flexible architecture supports future traceability chain expansion

**Item delete, edit, approve logic:**
- **Edit Permission:** Always allowed for non-deleted requirements
  - Users can edit both draft and approved requirements
  - Editing an approved requirement automatically reverts it to draft status
  - Edit action is disabled only when requirement is deleted (deleted_at is set)
- **Delete Permission:** Always allowed for non-deleted requirements  
  - Soft delete only - sets deleted_at timestamp
  - Revision number does NOT increment on delete
  - Delete action is disabled only when requirement is already deleted
  - Deleted requirements remain in database for audit trail
- **Approve Permission:** Only allowed when:
  - Requirement status is 'draft'
  - Requirement is not deleted (deleted_at is null)
  - Requires password confirmation and optional approval notes
  - Approval increments revision number
  - Sets approved_at timestamp and approved_by user ID
  - Changes status from 'draft' to 'approved'

**File Structure:**

```
azure-reqquli/
├── src/
│   ├── server/                         # Express backend
│   │   ├── config/
│   │   │   ├── database.ts            # PostgreSQL connection pooling
│   │   │   ├── jwt.config.ts          # JWT configuration
│   │   │   └── logger.ts              # Logging configuration
│   │   ├── middleware/
│   │   │   ├── auth.ts                # Authentication middleware
│   │   │   ├── errorHandler.ts        # Global error handling
│   │   │   └── rateLimiter.ts         # Rate limiting middleware
│   │   ├── routes/
│   │   │   ├── auth.ts                # Authentication endpoints
│   │   │   ├── systemrequirements.ts  # System requirements CRUD
│   │   │   ├── testRuns.ts            # Test runs and execution
│   │   │   ├── traces.ts              # Traceability management
│   │   │   └── userrequirements.ts    # User requirements CRUD
│   │   ├── services/
│   │   │   ├── email.service.ts       # Email service (logging only)
│   │   │   └── user.service.ts        # User management service
│   │   └── server.ts                   # Main Express application
│   ├── client/                         # React frontend
│   │   ├── components/
│   │   │   ├── atoms/                 # Basic UI elements
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Checkbox.tsx
│   │   │   │   ├── Heading.tsx
│   │   │   │   ├── Icon.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── ListItemStyle.tsx
│   │   │   │   ├── Logo.tsx
│   │   │   │   ├── MonoText.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── Stack.tsx
│   │   │   │   ├── Text.tsx
│   │   │   │   ├── Textarea.tsx
│   │   │   │   └── index.ts
│   │   │   ├── molecules/             # Composite components
│   │   │   │   ├── ActionButton.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── FormField.tsx
│   │   │   │   ├── LoadingState.tsx
│   │   │   │   ├── MetadataRow.tsx
│   │   │   │   ├── MetadataSection.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── PasswordConfirmModal.tsx
│   │   │   │   ├── RequirementCard.tsx
│   │   │   │   ├── RequirementHeader.tsx
│   │   │   │   ├── StatusIndicator.tsx
│   │   │   │   ├── TestExecutionModal.tsx
│   │   │   │   ├── TraceEditModal.tsx
│   │   │   │   ├── TraceLink.tsx
│   │   │   │   ├── TraceLinksSection.tsx
│   │   │   │   ├── TraceListItem.tsx
│   │   │   │   ├── UnifiedHeader.tsx
│   │   │   │   ├── UserSessionBox.tsx
│   │   │   │   └── index.ts
│   │   │   ├── organisms/             # Complex feature components
│   │   │   │   ├── DenseList.tsx
│   │   │   │   ├── DetailPanel.tsx
│   │   │   │   ├── RequirementForm.tsx
│   │   │   │   ├── RequirementList.tsx
│   │   │   │   ├── requirementsListControls.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TestCaseDetail.tsx
│   │   │   │   ├── TestCaseExecution.tsx
│   │   │   │   ├── TestCaseForm.tsx
│   │   │   │   ├── TestRunDetail.tsx
│   │   │   │   ├── TestRunForm.tsx
│   │   │   │   ├── TestRunList.tsx
│   │   │   │   └── index.ts
│   │   │   ├── templates/             # Page layouts
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── ListDetailLayout.tsx
│   │   │   │   ├── SplitPanelLayout.tsx
│   │   │   │   └── index.ts
│   │   │   ├── pages/                 # Full page components
│   │   │   │   ├── EmailVerificationPage.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── SystemrequirementsPage.tsx
│   │   │   │   ├── TestCasesPage.tsx
│   │   │   │   ├── TestRunsPage.tsx
│   │   │   │   ├── TraceabilityPage.tsx
│   │   │   │   ├── UserrequirementsPage.tsx
│   │   │   │   └── index.ts
│   │   │   └── auth/
│   │   │       └── AuthGuard.tsx      # Protected route wrapper
│   │   ├── stores/                    # Zustand state management
│   │   │   ├── authStore.ts
│   │   │   ├── systemrequirementstore.ts
│   │   │   ├── testRunStore.ts
│   │   │   └── userrequirementsStore.ts
│   │   ├── services/                  # API clients
│   │   │   ├── api.ts                 # Base API client
│   │   │   ├── approvalService.ts     # Approval workflow
│   │   │   ├── auth.ts                # Auth API calls
│   │   │   ├── requirementsApi.ts     # requirements API
│   │   │   └── testCaseApprovalService.ts # Test case approvals
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useFormValidation.ts
│   │   │   └── useRequirementFilters.ts
│   │   ├── utils/
│   │   │   └── formatters.ts          # Date/number formatting
│   │   ├── lib/
│   │   │   └── utils.ts               # Utility functions
│   │   ├── constants/
│   │   │   └── index.ts               # App constants
│   │   ├── assets.d.ts                # Asset type definitions
│   │   └── main.tsx                   # App entry point
│   └── types/                          # Shared TypeScript types
│       ├── authentication.ts
│       ├── common.ts
│       ├── system-requirements.ts
│       ├── test-runs.ts
│       ├── traces.ts
│       ├── user-requirements.ts
│       ├── index.ts                    # Type re-exports
│       └── index.js                    # CommonJS exports
├── docs/                              # Documentation
│   ├── spec/                          # Specifications
│   │   ├── gherks/                    # Feature documentation
│   │   │   ├── authentication.md
│   │   │   ├── manual-test-runs.md
│   │   │   ├── system-requirements.md
│   │   │   ├── trace_editing.md
│   │   │   └── user-requirements.md
│   │   └── openapi/                   # API documentation
│   │       ├── api.yaml               # Main API spec
│   │       ├── authentication.yaml
│   │       ├── common.yaml
│   │       ├── system-requirements.yaml
│   │       ├── test-runs.yaml
│   │       ├── traces.yaml
│   │       └── user-requirements.yaml
│   ├── CONTEXT.md                     # Project overview (this file)
│   ├── TEST-SETUP.md                  # Test configuration guide
│   └── TODO.md                        # Development tasks
├── tests/                             # Unit test files
│   ├── auth.test.ts
│   ├── system-requirements.test.ts
│   ├── traces.test.ts
│   └── user-requirements.test.ts
├── e2e/                               # End-to-end test files
│   ├── fixtures/
│   │   └── test-data.ts              # Test data and helpers
│   ├── auth.spec.ts
│   ├── user-requirements.spec.ts
│   ├── system-requirements.spec.ts
│   ├── traceability.spec.ts
│   └── accessibility.spec.ts
├── scripts/                           # Database scripts
│   ├── database-setup.sql            # Complete database schema (includes all tables)
│   └── seed-data.sql                 # Development test data
├── agents/                            # AI agent personas (ignored)
│   └── *.md
├── NOAI/                              # Files ignored by AI
│   ├── generate-mock-system-requirements.js
│   └── generate-mock-user-requirements.js
├── .claude/                           # Claude Code configuration
│   ├── commands/                     # Custom commands
│   │   ├── quicksave.md
│   │   ├── review-docs.md
│   │   ├── review-implementation.md
│   │   └── update-context.md
│   └── settings.local.json
├── Configuration Files
│   ├── package.json                  # Node dependencies
│   ├── package-lock.json
│   ├── tsconfig.json                 # TypeScript config
│   ├── tsconfig.node.json            # Node TypeScript config
│   ├── tsconfig.server.json          # Server TypeScript config
│   ├── vite.config.ts                # Vite build config
│   ├── tailwind.config.js            # Tailwind CSS config
│   ├── eslint.config.js              # ESLint config
│   ├── jest.config.js                # Jest testing config
│   └── docker-compose.yml            # Docker development
└── CLAUDE.md                         # AI work instructions
```

**Main types**:
- Authentication: User, RegisterRequest, RegisterResponse, VerifyEmailRequest, VerifyEmailResponse, ResendVerificationRequest, ResendVerificationResponse, Approver
- User requirements: UserRequirement, UserRequirementListResponse, UserRequirementResponse, CreateUserRequirementRequest, UpdateUserRequirementRequest, ApproveUserRequirementRequest, UserRequirementFilters
- System requirements: SystemRequirement, SystemRequirementListResponse, SystemRequirementResponse, CreateSystemRequirementRequest, UpdateSystemRequirementRequest, ApproveSystemRequirementRequest, SystemRequirementFilters
- Traces: RequirementTrace, TraceRelationship, RequirementTracesResponse, CreateTraceRequest, CreateTraceResponse, DeleteTraceResponse, GetTracesResponse
- Test Runs: TestCase, TestStep, TestRun, TestRunCase, TestStepResult, EvidenceFile, RequirementTestLink, CreateTestRunRequest, CreateTestCaseRequest, UpdateTestCaseRequest, ApproveTestCaseRequest, ExecuteTestCaseRequest, UpdateStepResultRequest
- Common: ErrorResponse

**Endpoints:**
- POST /api/auth/register
- GET /api/auth/verify-email/:token
- POST /api/auth/resend-verification
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/approvers
- GET /api/user-requirements
- GET /api/user-requirements/:id
- POST /api/user-requirements
- PATCH /api/user-requirements/:id
- POST /api/user-requirements/:id/approve
- DELETE /api/user-requirements/:id
- GET /api/user-requirements/:id/downstream-traces
- GET /api/system-requirements
- GET /api/system-requirements/trace-from/:userRequirementId
- GET /api/system-requirements/:id
- POST /api/system-requirements
- PATCH /api/system-requirements/:id
- POST /api/system-requirements/:id/approve
- DELETE /api/system-requirements/:id
- GET /api/traces/requirements/:id/traces
- POST /api/traces
- DELETE /api/traces/:fromId/:toId
- GET /api/test-runs
- POST /api/test-runs
- GET /api/test-runs/:run_id
- PUT /api/test-runs/:run_id/approve
- GET /api/test-cases
- POST /api/test-cases
- GET /api/test-cases/:id
- PATCH /api/test-cases/:id
- POST /api/test-cases/:id/approve
- DELETE /api/test-cases/:id
- POST /api/test-runs/:run_id/test-cases/:test_case_id/execute
- PUT /api/test-runs/:run_id/test-cases/:test_case_id/steps/:step_number
- POST /api/test-runs/:run_id/test-cases/:test_case_id/steps/:step_number/upload
- GET /api/evidence/:file_id

**What there isn't**:
- Comprehensive audit logging (only basic createdBy/modifiedBy tracking)
- Role-based access control (RBAC) not implemented
- Export/import functionality not implemented
- Real-time collaboration features not implemented
- Change history/revision comparison not implemented
- Notification system not implemented
- Dashboard/analytics not implemented
- Batch operations not implemented
- Email service only logs to console (doesn't actually send emails)
- Password reset functionality not implemented
- User profile management not implemented
- Webhooks or integrations not implemented
- Rate limiting not implemented
- Multi-tenancy not implemented

### Technical Architecture

**Technology Stack:**

- Express 5.1.0 server (Node.js/TypeScript)
- React 19 UI served from Express server
- PostgreSQL database with connection pooling
- Tailwind CSS 4.x, Radix UI, Lucide React for styling
- Zustand state management with shallow selectors for performance
- Vite build tooling for frontend
- Docker Compose for development environment

## Business Rules and Patterns

For detailed business rules, implementation patterns, and development standards, see [BUSINESS.md](./BUSINESS.md).

## Development Environment

### Setup requirements

- Node.js 18+ with TypeScript
- PostgreSQL 14+ (Docker Compose provided)
- Vite development server (port 5173)
- Express server (port 3000)

### Environment Variables

**Required for all environments:**
```bash
# Security - REQUIRED
JWT_SECRET=                  # Min 32 chars, generate with: openssl rand -base64 32

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=reqquli
DB_PASSWORD=reqquli_dev
DB_NAME=azure_reqquli

# Application
NODE_ENV=development         # development | production | test
CLIENT_URL=http://localhost:5173
```

**Production-specific variables:**
```bash
# Database SSL
DB_CA_CERT=                  # CA certificate for database SSL validation
DB_ALLOW_SELF_SIGNED=false   # Set to 'true' ONLY for Azure managed databases

# Cookie Configuration
COOKIE_DOMAIN=.yourdomain.com  # Domain for auth cookies
```

### Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create .env file:**
   ```bash
   cp .env.example .env
   # Edit .env and set JWT_SECRET (required)
   openssl rand -base64 32  # Generate a secure secret
   ```

3. **Setup database:**
   ```bash
   # Option 1: Docker Compose (recommended)
   docker-compose up -d

   # Option 2: Manual PostgreSQL
   psql -U postgres -f scripts/database-setup.sql
   psql -U reqquli -d azure_reqquli -f scripts/seed-data.sql
   ```

4. **Run development servers:**
   ```bash
   # Terminal 1: Backend
   npm run dev:server

   # Terminal 2: Frontend
   npm run dev:client
   ```

### Security Configuration

**JWT Authentication:**
- JWT_SECRET is mandatory (min 32 characters)
- No hardcoded fallback secrets
- Tokens expire after 4 hours (access) and 7 days (refresh)
- Weak secrets are rejected (no 'password', 'secret', 'changeme', etc.)

**Database Security:**
- SSL/TLS required in production
- Certificate validation enabled by default
- Self-signed certs only allowed with explicit DB_ALLOW_SELF_SIGNED=true

**Rate Limiting:**
- Not implemented - no rate limiting on any endpoints

**Cookie Security:**
- httpOnly: true (prevents XSS attacks)
- secure: true (HTTPS required)
- sameSite: strict (CSRF protection)
- 4-hour expiration

**File Upload Security:**
- Filenames sanitized to prevent path traversal
- Unique IDs generated with crypto.randomBytes
- 10MB file size limit
- Restricted file types (images, PDFs, documents)
- Stored outside web root in uploads/evidence

**Request Security:**
- JSON body limited to 1MB
- SQL injection prevented via parameterized queries
- Table names whitelisted in dynamic queries
- All user inputs sanitized

### Build Process

- Frontend: Vite builds React app to dist/client
- Backend: TypeScript compilation to dist/server
- Unified deployment: Express serves static assets and API

## Code Quality Standards

For code quality standards, development practices, and UI/UX guidelines, see [BUSINESS.md](./BUSINESS.md).

### Testing Infrastructure

#### E2E Testing with Playwright
- **Framework:** Playwright Test v1.55.0 for end-to-end testing
- **Configuration:** playwright.config.ts defines test environment
  - Test directory: ./e2e
  - Base URL: http://localhost:5173 (configurable via PLAYWRIGHT_BASE_URL env)
  - Browsers: Chromium only (Safari and Edge disabled)
  - Viewport: 1280x720
  - Timeouts: 10s action, 30s navigation
  - Screenshots on failure, traces on retry
  - JSON reporter outputs to playwright-report/test-results.json
- **Test Organization:**
  - auth.spec.ts - Authentication flows (login, logout, session management)
  - user-requirements.spec.ts - User requirements CRUD operations
  - system-requirements.spec.ts - System requirements and traceability
  - traceability.spec.ts - Trace relationship management
- **Test Data & Fixtures:**
  - e2e/fixtures/test-data.ts contains:
    - Test users (admin@reqquli.com, test@example.com)
    - Sample requirements data
    - Comprehensive selector mappings (data-testid attributes)
    - API endpoint definitions
    - Helper utilities (waitForElement, fillAndSubmitForm, auth checks)
- **Test Patterns:**
  - Direct URL navigation preferred over UI interactions for reliability
  - Use data-testid attributes for element selection
  - Centralized test data in fixtures
  - Helper functions for common operations
- **NPM Scripts:**
  - `npm run test:e2e` - Run all E2E tests
  - `npm run test:e2e:ui` - Open Playwright UI for debugging

#### Unit Testing
- Jest configured for API tests (tests/*.test.ts)
- NPM scripts: test:api, test:api:watch, test:api:coverage

### Testing and Documentation

For testing considerations, documentation requirements, and project constraints, see [BUSINESS.md](./BUSINESS.md).

## Project Documentation Structure

### Key Configuration Files

- **CONTEXT.md** - System overview, current implementation status, business rules, and code standards
- **CLAUDE.md** - AI work instructions only
- **package.json** - Node.js dependencies and scripts
- **tsconfig.json** - TypeScript compilation configuration
- **vite.config.ts** - Frontend build configuration
- **docker-compose.yml** - Development environment setup
