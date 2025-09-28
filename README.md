# Reqquli - Requirements Management System

A comprehensive requirements management system designed for regulatory compliance, providing full traceability between user requirements, system requirements, and test cases.

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

## Documentation

For detailed documentation, see:
- **[CONTEXT.md](docs/CONTEXT.md)** - Complete system overview, architecture, and implementation details
- **[BUSINESS.md](docs/BUSINESS.md)** - Business rules, standards, and development practices
- **[API Specification](docs/spec/openapi/api.yaml)** - OpenAPI documentation
- **[Feature Specifications](docs/spec/gherks/)** - Gherkin scenarios for all features

## Production Deployment

1. Build: `npm run build`
2. Set production environment variables (see CONTEXT.md)
3. Start: `NODE_ENV=production npm start`

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