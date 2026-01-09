# Todo App - Project Rules

## Overview
A simple task management application built with React and Node.js.

## Tech Stack
- Frontend: React 18, TypeScript, Tailwind CSS
- Backend: Node.js, Express, PostgreSQL
- Testing: Jest, React Testing Library

## Project Conventions

### Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use named exports, not default exports

### File Structure
```
src/
  components/   # React components
  hooks/        # Custom hooks
  api/          # API client functions
  types/        # TypeScript types
  utils/        # Helper functions
server/
  routes/       # Express routes
  models/       # Database models
  middleware/   # Express middleware
```

### Database
- Use migrations for schema changes
- Never modify production data directly
- All tables have created_at, updated_at timestamps

## Hard Rules
- No inline styles
- All API endpoints require authentication
- No raw SQL queries (use ORM)
- All user input must be validated

## Definition of Done
- [ ] Code compiles without errors
- [ ] Tests pass (min 80% coverage)
- [ ] No TypeScript `any` types
- [ ] API documented in OpenAPI spec
- [ ] Reviewed by at least one team member
