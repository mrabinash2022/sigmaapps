# Code review guide

Human-readable checklist for pull requests. Cursor AI uses the shorter version in `.cursor/rules/code-review.mdc`.

## When to use this doc

- Reviewing a teammate's PR
- Onboarding a new contributor
- Expanding review criteria beyond what fits in Cursor rules

## Review areas

### 1. Product & correctness

- Does the change match the ticket / user story?
- Are order lifecycle rules respected (see `docs/architecture.md` § Order Lifecycle)?
- Are partial fulfillment, backorders, returns, and refunds handled consistently?

### 2. API design

- RESTful paths under `/api/*`
- Consistent `{ error: "message" }` error responses
- Pagination/filtering patterns match existing routes
- Idempotent transitions where appropriate

### 3. Mobile UX

- Loading and error states
- Role-appropriate navigation (customer vs shop admin vs super admin)
- Accessible touch targets and readable copy

### 4. Security

- Authentication and authorization on every protected endpoint
- Rate limits on auth and log ingest
- No sensitive data in logs or client-visible errors

### 5. Data & migrations

- Migrations are safe to run on existing databases (`IF NOT EXISTS`, enum checks)
- Sequelize models match DB schema
- `docs/app.sql` updated when schema changes

### 6. Observability

- Errors logged with context via Winston / mobile logger
- No log files committed

### 7. Documentation

- `cursor.md` — stack or convention changes
- `docs/architecture.md` — system design changes
- `README.md` — setup or demo account changes

## Automated checks

CI workflows under `.github/workflows/`:

| Workflow | When | Command equivalent |
|----------|------|-------------------|
| `api-test.yml` | PR + push to `main` | `npm run test:api:ci` |
| `mobile-smoke.yml` | Merge, nightly, manual | `maestro test apps/e2e-mobile/flows` |

Run API tests locally before opening a PR:

```bash
npm run test:api:ci
```

See [docs/testing/README.md](./testing/README.md) for setup, troubleshooting, and Maestro instructions.

Planned additions:

- ESLint / formatter
- `npm audit` for critical vulnerabilities

## PR template snippet (future)

```markdown
## Summary
-

## Test plan
- [ ] API starts (`npm run api`)
- [ ] Mobile loads (`npm run mobile`)
- [ ] Manually tested: ...

## Checklist
- [ ] No secrets or log files committed
- [ ] Architecture docs updated if needed
```
