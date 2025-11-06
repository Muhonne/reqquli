# Reqquli - Requirements Management System

A comprehensive requirements management system designed for regulatory compliance, providing full traceability between user requirements, system requirements, and test cases. Reqquli is a requirements management platform that provides editability, versioning, approvals, and traceability to assist with regulatory compliance.

## Quick Start

1. **Prerequisites:**
   - Node.js 20+
   - Docker and Docker Compose

2. **Setup:**
   ```bash
   # Clone and install
   git clone https://github.com/yourusername/reqquli.git
   cd reqquli
   npm install

   # Configure environment
   cp .env.example .env
   # Edit .env and set JWT_SECRET (use: openssl rand -base64 32)

   # Start database
   docker-compose up -d

   # Run development servers
   npm run dev
   ```

3. **Access:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Default login: admin@reqquli.com / salasana!123

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build for production
- `npm run test:api` - Run API tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:smoke` - Run smoke tests
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## System Overview

**Current Status:** Functional MVP with full traceability implementation (UR → SR) and manual test execution capability

Reqquli delivers comprehensive requirements lifecycle management with full traceability implementation and manual test execution.

### Current Implementation Status

**Features implemented:**

All implemented features are documented in feature-specific Gherkin specifications in [`docs/spec/`](docs/spec/):
- Authentication: `docs/spec/authentication.md`
- User Requirements: `docs/spec/user-requirements.md`
- System Requirements: `docs/spec/system-requirements.md`
- Traceability: `docs/spec/trace_editing.md`
- Manual Test Runs: `docs/spec/manual-test-runs.md`
- Audit Logging: `docs/spec/audit.md`

### Not and not-to-be implemented

- Comprehensive audit logging UI/frontend (audit logging backend is implemented with database triggers and API endpoints, but no frontend interface exists)
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

### Database Design

**Technology:**
- PostgreSQL with connection pooling (pg library)
- UUID support via uuid-ossp extension
- Sequences for requirement numbering (user_requirement_seq, system_requirement_seq)

**Database Schema:**

Complete database schema including all tables, columns, constraints, and indexes is defined in:
- Schema setup: [`scripts/database-setup.sql`](scripts/database-setup.sql)
- Development seed data: [`scripts/seed-data.sql`](scripts/seed-data.sql)

**Default user in seed-data:** admin@reqquli.com with password salasana!123. This should be used for authentication everywhere.

### Key Design Principles

- Sequential ID generation for requirements (UR-1, UR-2, SR-1, SR-2 format)
- Soft delete implementation across all requirement tables (deletedAt timestamps)
- Revision tracking with approval workflow (revision increments only on approval)
- Foreign key relationships for traceability and user tracking

### Item Delete, Edit, Approve Logic

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

## Business Rules and Implementation Patterns

### Approval Workflow

- Requirements inactive until approved (any logged-in user can approve)
- Approval status visible throughout system
- Revision starts at 0 when created, increments only when item is approved (not when saving/editing)

### Data Integrity

- Requirements can't be deleted, only marked as deleted (soft delete)
- Soft delete only - no permanent deletion (revision number does NOT increment on delete)
- Revision tracking for all requirement types (increments ONLY on approval, not on edit or delete)
- Referential integrity maintained through foreign key constraints

### Validation Rules

- **Title constraints:** Maximum 200 characters, must be unique within requirement type
- **Description constraints:** Minimum 1 character required (not empty)
- **Authentication validation:** See docs/spec/gherks/authentication.md for password and security requirements

### Implementation Patterns

#### Component Architecture

- Atomic design pattern: atoms → molecules → organisms → templates → pages
- Type-safe props and interfaces throughout
- Avoid making huge components, split child components into separate files
- Use atomic design when creating components:
  - **atoms**: Basic UI elements (buttons, inputs, badges)
  - **molecules**: Simple component combinations (form fields, list items)
  - **organisms**: Complex, feature-rich components (forms, matrices, lists)
  - **templates**: Page layouts (main layout, sidebars)
  - **pages**: Full page components with business logic

#### Data Consistency

- ALWAYS use uppercase format for requirement IDs (UR-1, SR-1) with hyphens, never spaces
- Database, frontend, URLs, and all components must use uppercase IDs with hyphens consistently
- ID format: UR-{number}, SR-{number} (e.g. UR-1, UR-2, SR-1, SR-2)
- No case conversion - uppercase with hyphens everywhere

#### URL-Based Navigation

- **Direct requirement access:** Requirements support direct URL navigation via `/user-requirements/{id}` and `/system-requirements/{id}`
- **Implementation pattern:** Both frontend routing and backend APIs support direct requirement access by ID
- **Testing approach:** E2E tests should use direct URL navigation for reliable requirement access
  - Example: `await page.goto('/system-requirements/SR-95')` instead of searching in lists
- **Benefits:**
  - Faster test execution by avoiding UI list interactions
  - More reliable tests that don't depend on sort order or pagination
  - Better user experience with shareable deep links to specific requirements
- **Frontend routing:** React Router handles direct navigation to requirement detail views
- **Backend support:** GET endpoints accept requirement IDs in URL paths for direct retrieval

### Code Quality Standards

#### TypeScript & Type Safety

- Use strict typing and proper interface definitions
- Define all prop types explicitly
- Avoid using `any` type
- Create shared types in `/src/types` directory
- **Field Naming Convention**: Always use camelCase for field names in TypeScript interfaces, API requests/responses, and database result mappings (e.g., `fullName` not `full_name`). The database may use snake_case internally, but all TypeScript/JavaScript code must use camelCase consistently

#### State Management

- Use Zustand for state management
- ALWAYS use shallow selectors for performance optimization
- Example: `const items = useStore((state) => state.items, shallow)`
- Split stores by feature/domain
- Avoid prop drilling and parent components handling childrens errors
- Components should encapsulate their internal logic, get minimal props and access store directly

#### Performance Optimization

- Use `useMemo` for expensive computations
- Use `useCallback` for functions passed as props

#### Error Handling

- Implement consistent error handling patterns
- Use try-catch blocks in async functions
- Provide user-friendly error messages
- Log errors appropriately for debugging

### UI/UX Guidelines

- Follow a "newspaper & blueprint" aesthetic: clean, professional, information-dense layouts with minimal colors
- Use a monochromatic palette (dark gray text, light gray backgrounds) with sparse accent colors only for status indicators (red for errors, green for success, blue for primary actions, amber for warnings)
- Maintain utilitarian design with dense lists and detailed side panels
- Use subtle, functional animations only to indicate state changes (soft fades, gentle transitions)
- Ensure adequate padding, spacing, and high contrast for accessibility
- Keep the interface responsive and professional, prioritizing clarity and efficiency over decoration
- **No rounded corners**: All components must use sharp, rectangular edges (no border-radius)

### Development Stack

- Use Tailwind CSS for styling
- Use Lucide React for UI icons
- Implement proper TypeScript types

### Testing Considerations

- Test critical business logic
- Verify traceability chains work correctly
- Test approval workflows
- Ensure soft delete functionality works
- Use direct URL navigation in E2E tests for reliability
- Maintain comprehensive data-testid attributes for UI testing

### Documentation Requirements

- Document complex logic with inline comments
- Document API endpoints and their parameters in docs/spec/openapi

### Specific Project Constraints

- User and System requirements should use identical components for create/view/edit

### Security Patterns

#### JWT Authentication

- JWT_SECRET is mandatory (min 32 characters)
- No hardcoded fallback secrets
- Tokens expire after 4 hours (access) and 7 days (refresh)
- Weak secrets are rejected (no 'password', 'secret', 'changeme', etc.)

#### Database Security

- SSL/TLS required in production
- Certificate validation enabled by default
- Self-signed certs only allowed with explicit DB_ALLOW_SELF_SIGNED=true

#### Cookie Security

- httpOnly: true (prevents XSS attacks)
- secure: true (HTTPS required)
- sameSite: strict (CSRF protection)
- 4-hour expiration

#### File Upload Security

- Filenames sanitized to prevent path traversal
- Unique IDs generated with crypto.randomBytes
- 10MB file size limit
- Restricted file types (images, PDFs, documents)
- Stored outside web root in uploads/evidence

#### Request Security

- JSON body limited to 1MB
- SQL injection prevented via parameterized queries
- Table names whitelisted in dynamic queries
- All user inputs sanitized

## Technical Architecture

**Technology Stack:**

- Express 5.1.0 server (Node.js/TypeScript)
- React 19 UI served from Express server
- PostgreSQL database with connection pooling
- Tailwind CSS 4.x, Lucide React for icons
- Zustand state management with shallow selectors for performance
- Vite build tooling for frontend
- Docker Compose for development environment

### File Structure

```
reqquli/
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
│   │   │   ├── molecules/             # Composite components
│   │   │   ├── organisms/             # Complex feature components
│   │   │   ├── templates/             # Page layouts
│   │   │   ├── pages/                 # Full page components
│   │   │   └── auth/
│   │   │       └── AuthGuard.tsx      # Protected route wrapper
│   │   ├── stores/                    # Zustand state management
│   │   ├── services/                  # API clients
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── utils/                     # Utility functions
│   │   ├── lib/                       # Library functions
│   │   ├── constants/                 # App constants
│   │   └── main.tsx                   # App entry point
│   └── types/                          # Shared TypeScript types
├── docs/                              # Documentation
│   ├── spec/                          # Specifications
│   │   ├── gherks/                    # Feature documentation
│   │   └── openapi/                   # API documentation
│   └── azure-deployment.md            # Deployment guide
├── tests/                             # Unit test files
├── e2e/                               # End-to-end test files
├── scripts/                           # Database scripts
├── agents/                            # AI agent personas (ignored)
├── NOAI/                              # Files ignored by AI
├── .claude/                           # Claude Code configuration
├── Configuration Files
└── LICENSE
```

### Data Types

All TypeScript types are defined in [`src/types/`](src/types/) with separate files for each feature:
- Authentication types: `src/types/authentication.ts`
- User requirements types: `src/types/user-requirements.ts`
- System requirements types: `src/types/system-requirements.ts`
- Trace types: `src/types/traces.ts`
- Test run types: `src/types/test-runs.ts`
- Common types: `src/types/common.ts`

### API Endpoints

All API endpoints are defined in [`docs/spec/openapi/`](docs/spec/openapi/) with separate OpenAPI specs for each feature:
- Authentication endpoints: `docs/spec/openapi/authentication.yaml`
- User requirements endpoints: `docs/spec/openapi/user-requirements.yaml`
- System requirements endpoints: `docs/spec/openapi/system-requirements.yaml`
- Trace endpoints: `docs/spec/openapi/traces.yaml`
- Test run endpoints: `docs/spec/openapi/test-runs.yaml`
- Main API spec: `docs/spec/openapi/api.yaml`

## Development Environment

### Setup Requirements

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
DB_USER=reqquli_db_user
DB_PASSWORD=reqquli_dev_password
DB_NAME=reqquli_db

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

### Build Process

- Frontend: Vite builds React app to dist/client
- Backend: TypeScript compilation to dist/server
- Unified deployment: Express serves static assets and API

## Testing Infrastructure

### E2E Testing with Playwright

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
  - accessibility.spec.ts - Accessibility testing
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

### Unit Testing

- Jest configured for API tests (tests/*.test.ts)
- NPM scripts: test:api, test:api:watch, test:api:coverage

## Documentation

For detailed specifications:
- **[Feature Specifications](docs/spec/gherks/)** - Gherkin scenarios for all features
- **[API Specification](docs/spec/openapi/api.yaml)** - OpenAPI documentation
- **[Azure Deployment Guide](docs/azure-deployment.md)** - Cloud deployment instructions

## Production Deployment

1. Build: `npm run build`
2. Set production environment variables (see Environment Variables section)
3. Start: `NODE_ENV=production npm start`

See [Azure Deployment Guide](docs/azure-deployment.md) for cloud deployment instructions.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Note**: This is a development project. For production use, ensure proper security measures, backup strategies, and compliance with your organization's requirements.
