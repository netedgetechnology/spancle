# Contributing to Spancle Sports OS

## Prerequisites

- Node.js `20.11.0` (use `.nvmrc`: `nvm use`)
- pnpm `>=9.0.0`
- Docker Desktop (for local infrastructure)
- Git

## Getting Started

```bash
git clone <repo>
cd spancle-sports-os
nvm use
pnpm install
cp .env.example .env
# Edit .env with local values
docker compose -f infrastructure/docker/docker-compose.yml up -d
pnpm dev
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Protected. |
| `develop` | Integration branch. All PRs target this. |
| `feat/<scope>/<description>` | Feature branches |
| `fix/<scope>/<description>` | Bug fix branches |
| `chore/<description>` | Maintenance branches |

## Commit Convention

Format: `<type>(<scope>): <description>`

```
feat(tenant): add tenant provisioning endpoint
fix(auth): resolve refresh token rotation race condition
chore(deps): upgrade NestJS to v11.0.0
```

See `commitlint.config.js` for allowed types and scopes.

## Code Standards

- All code must pass `pnpm lint` with zero warnings
- All code must pass `pnpm typecheck`
- New services must include unit tests with ≥80% coverage
- Every new API endpoint requires: DTO validation, permission guard, audit log emission
- No `any` types without a documented justification comment

## Pull Request Requirements

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] New code has test coverage
- [ ] Tenant isolation preserved (if applicable)
- [ ] Audit log emission added (for mutating operations)
- [ ] PR description explains the change and links to ticket
