# Business Rules and Implementation Patterns

This document contains the HOWs of the Reqquli system - business rules, implementation patterns, development standards, and architectural decisions.

## Business Rules

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

## Implementation Patterns

### Component Architecture

- Atomic design pattern: atoms → molecules → organisms → templates → pages
- Type-safe props and interfaces throughout
- Avoid making huge components, split child components into separate files
- Use atomic design when creating components:
  - **atoms**: Basic UI elements (buttons, inputs, badges)
  - **molecules**: Simple component combinations (form fields, list items)
  - **organisms**: Complex, feature-rich components (forms, matrices, lists)
  - **templates**: Page layouts (main layout, sidebars)
  - **pages**: Full page components with business logic

### Data Consistency

- ALWAYS use uppercase format for requirement IDs (UR-1, SR-1) with hyphens, never spaces
- Database, frontend, URLs, and all components must use uppercase IDs with hyphens consistently
- ID format: UR-{number}, SR-{number} (e.g. UR-1, UR-2, SR-1, SR-2)
- No case conversion - uppercase with hyphens everywhere

### URL-Based Navigation

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

### Traceability Implementation

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
  - Many-to-many relationships: Requirements can have multiple upstream and downstream traces
  - Traceability preserved through soft delete (deleted_at timestamps on requirements)
  - Trace relationships can be modified regardless of requirement approval status
  - Orphaned requirements are permitted and tracked
  - Flexible architecture supports future traceability chain expansion

## Code Quality Standards

### TypeScript & Type Safety

- Use strict typing and proper interface definitions
- Define all prop types explicitly
- Avoid using `any` type
- Create shared types in `/src/types` directory
- **Field Naming Convention**: Always use camelCase for field names in TypeScript interfaces, API requests/responses, and database result mappings (e.g., `fullName` not `full_name`). The database may use snake_case internally, but all TypeScript/JavaScript code must use camelCase consistently

### State Management

- Use Zustand for state management
- ALWAYS use shallow selectors for performance optimization
- Example: `const items = useStore((state) => state.items, shallow)`
- Split stores by feature/domain
- Avoid prop drilling and parent components handling childrens errors
- Components should encapsulate their internal logic, get minimal props and access store directly

### Performance Optimization

- Use `useMemo` for expensive computations
- Use `useCallback` for functions passed as props

### Error Handling

- Implement consistent error handling patterns
- Use try-catch blocks in async functions
- Provide user-friendly error messages
- Log errors appropriately for debugging

## UI/UX Guidelines

- Follow a "newspaper & blueprint" aesthetic: clean, professional, information-dense layouts with minimal colors
- Use a monochromatic palette (dark gray text, light gray backgrounds) with sparse accent colors only for status indicators (red for errors, green for success, blue for primary actions, amber for warnings)
- Maintain utilitarian design with dense lists and detailed side panels
- Use subtle, functional animations only to indicate state changes (soft fades, gentle transitions)
- Ensure adequate padding, spacing, and high contrast for accessibility
- Keep the interface responsive and professional, prioritizing clarity and efficiency over decoration
- **No rounded corners**: All components must use sharp, rectangular edges (no border-radius)

## Development Stack

- Use Tailwind CSS for styling
- Use Radix UI and Lucide React for UI components
- Implement proper TypeScript types

## Testing Considerations

- Test critical business logic
- Verify traceability chains work correctly
- Test approval workflows
- Ensure soft delete functionality works
- Use direct URL navigation in E2E tests for reliability
- Maintain comprehensive data-testid attributes for UI testing

## Documentation Requirements

- Document complex logic with inline comments
- Document API endpoints and their parameters in docs/spec/openapi

## Specific Project Constraints

- User and System requirements should use identical components for create/view/edit

## Security Patterns

### JWT Authentication

- JWT_SECRET is mandatory (min 32 characters)
- No hardcoded fallback secrets
- Tokens expire after 4 hours (access) and 7 days (refresh)
- Weak secrets are rejected (no 'password', 'secret', 'changeme', etc.)

### Database Security

- SSL/TLS required in production
- Certificate validation enabled by default
- Self-signed certs only allowed with explicit DB_ALLOW_SELF_SIGNED=true

### Cookie Security

- httpOnly: true (prevents XSS attacks)
- secure: true (HTTPS required)
- sameSite: strict (CSRF protection)
- 4-hour expiration

### File Upload Security

- Filenames sanitized to prevent path traversal
- Unique IDs generated with crypto.randomBytes
- 10MB file size limit
- Restricted file types (images, PDFs, documents)
- Stored outside web root in uploads/evidence

### Request Security

- JSON body limited to 1MB
- SQL injection prevented via parameterized queries
- Table names whitelisted in dynamic queries
- All user inputs sanitized