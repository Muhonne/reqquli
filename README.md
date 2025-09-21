# Reqquli - Requirements Management System

A comprehensive requirements management system designed for regulatory compliance, providing full traceability between user requirements, system requirements, and test cases.

## Features

- **Requirements Management**: Create, edit, approve, and track user and system requirements
- **Full Traceability**: Bidirectional traceability between all requirement types and test cases
- **Approval Workflow**: Built-in approval process with password confirmation and revision tracking
- **Test Management**: Create test cases, execute test runs, and track results with evidence
- **Audit Trail**: Complete audit logging of all system activities
- **Version Control**: Automatic revision tracking for all requirements
- **Soft Delete**: Maintain data integrity with soft delete functionality
- **Export Capabilities**: Export requirements and test results in multiple formats

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 15
- **Authentication**: JWT with refresh tokens
- **Testing**: Jest, Playwright
- **Development**: Docker, ESLint, Prettier

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 15 (via Docker)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/reqquli.git
cd reqquli
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=reqquli
DB_PASSWORD=reqquli_dev
DB_NAME=azure_reqquli

# Server Configuration
PORT=3000
NODE_ENV=development

# Authentication - IMPORTANT: Generate a secure secret for production
JWT_SECRET=your-secure-secret-here-min-32-chars
```

5. Start the database:
```bash
docker-compose up -d
```

6. Start the development server:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build for production
- `npm run server:dev` - Start backend only
- `npm run client:dev` - Start frontend only
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run test:api` - Run API tests
- `npm run test:e2e` - Run end-to-end tests

### Database Management

Reset database with fresh seed data:
```bash
docker-compose down -v
docker-compose up -d
```

### Project Structure

```
reqquli/
├── src/
│   ├── client/         # React frontend
│   │   ├── components/ # UI components (atomic design)
│   │   ├── pages/      # Page components
│   │   ├── stores/     # Zustand state management
│   │   └── types/      # TypeScript types
│   ├── server/         # Express backend
│   │   ├── routes/     # API routes
│   │   ├── config/     # Configuration
│   │   └── utils/      # Utility functions
│   └── types/          # Shared TypeScript types
├── scripts/            # Database setup and seed scripts
├── tests/              # API tests
├── e2e/               # Playwright E2E tests
└── docs/              # Documentation
    ├── CONTEXT.md     # Business rules and standards
    └── spec/          # API and feature specifications
```

## API Documentation

The API follows RESTful principles. Key endpoints include:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token

### Requirements
- `GET /api/user-requirements` - List user requirements
- `POST /api/user-requirements` - Create user requirement
- `PUT /api/user-requirements/:id` - Update requirement
- `POST /api/user-requirements/:id/approve` - Approve requirement

### Traceability
- `GET /api/requirements/:id/traces` - Get requirement traces
- `POST /api/traces` - Create trace relationship
- `DELETE /api/traces/:fromId/:toId` - Delete trace

### Test Management
- `GET /api/test-cases` - List test cases
- `POST /api/test-runs` - Create test run
- `POST /api/test-runs/:runId/test-cases/:testCaseId/execute` - Execute test

For complete API documentation, see `/docs/spec/openapi/api.yaml`.

## Testing

### Unit/API Tests
```bash
npm run test:api
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Smoke Tests
```bash
npm run test:e2e:smoke
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables:
- Generate secure JWT_SECRET: `openssl rand -base64 32`
- Configure database SSL/TLS
- Set NODE_ENV=production

3. Start the production server:
```bash
npm start
```

## Security Considerations

- JWT tokens expire after 4 hours (access) and 7 days (refresh)
- Passwords are hashed using bcrypt with salt rounds of 10
- All cookies are httpOnly, secure, and sameSite:strict
- File uploads limited to 10MB with type restrictions
- SQL injection prevention via parameterized queries
- Rate limiting on API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Acknowledgments

- Built with modern web technologies
- Designed for regulatory compliance workflows
- Follows atomic design principles for UI components

---

**Note**: This is a development project. For production use, ensure proper security measures, backup strategies, and compliance with your organization's requirements.