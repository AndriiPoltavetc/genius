# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial monorepo structure with npm workspaces
- Shared TypeScript types (`@genius/shared`)
- PostgreSQL schema via Prisma (User, Game, Move, ChatMessage)
- Server skeleton: Express, Socket.IO, JWT auth, rate limiting
- AI module: Minimax with Alpha-Beta pruning, piece-square tables, evaluation function
- Client skeleton: React 18, Redux Toolkit, RTK Query, React Router v6
- Docker Compose for local development (PostgreSQL 16 + Redis 7)
- CI/CD workflows (GitHub Actions)
- ELO rating calculation (K=20)
- Redis-based matchmaking with dynamic rating range expansion

### Changed

### Deprecated

### Removed

### Fixed

### Security
