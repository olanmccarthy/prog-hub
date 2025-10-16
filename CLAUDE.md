# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

prog-hub is a web application for managing Yu-Gi-Oh progression series tournaments. The application handles player registration, deck submission, banlist management (voting and suggestions), match pairings, results tracking, and standings calculation.

## Technology Stack

- **Framework**: Next.js 15.5.5 (App Router with Turbopack)
- **Frontend**: React 19.1.0 with Material-UI (@mui/material)
- **Database**: MySQL 8.0
- **ORM**: TypeORM 0.3.27 with TypeScript decorators
- **Runtime**: Node.js 20+
- **Containerization**: Docker with separate dev/prod configurations

## Development Commands

### Local Development (Recommended)
```bash
npm run docker:dev:up        # Start dev containers with hot reload (localhost:3000)
npm run docker:dev:down      # Stop dev containers
npm run docker:dev:build     # Rebuild dev containers
npm run docker:dev:clean     # Remove containers, volumes, and images
```

**Important**: Always use Docker commands for development to ensure consistency with production environment.

### Production Build
```bash
npm run docker:up            # Start production containers (no hot reload)
npm run docker:down          # Stop production containers
npm run docker:build         # Rebuild production containers
npm run docker:clean         # Remove production containers and volumes
```

### Code Quality
```bash
npm run lint                 # Run ESLint
npm run typecheck            # Run TypeScript type checking without emitting files
```

### Database Migrations (TypeORM)
```bash
npm run migration:generate   # Generate migration from entity changes
npm run migration:run        # Run pending migrations
npm run migration:revert     # Revert last migration
```

**Note**: Migrations require TypeORM data source configuration in `src/lib/data-source.ts` (currently missing).

## Architecture

### Data Model

The application uses TypeORM entities that map to MySQL tables defined in `schema.sql`. The data model centers around progression "sessions" (tournaments):

**Core Entities** (in `src/entities/`):
- **Player**: Tournament participants
- **Session**: A progression tournament event with top 6 placements (first through sixth)
- **Decklist**: Player's deck for a session (maindeck, sidedeck, extradeck as JSON arrays)
- **Banlist**: Card restrictions for a session (banned, limited, semilimited, unlimited as JSON arrays)
- **BanlistSuggestion**: Player-submitted banlist changes for voting
- **BanlistSuggestionVote**: Votes on banlist suggestions
- **Pairing**: Match pairings for each round of a session
- **VictoryPoint**: Victory points awarded to players per session

**Key Relationships**:
- Sessions store top 6 placements as foreign keys to Player
- Decklists belong to both a Player and a Session
- Banlists belong to Sessions and have many BanlistSuggestions
- Pairings link two players (player1, player2) with win counts for a specific session/round

### Type System

**Dual Type Approach**: The codebase maintains both TypeORM entities and separate TypeScript type definitions:
- **Entities** (`src/entities/*.ts`): TypeORM decorators for database mapping
- **Types** (`src/types/*.ts`): Plain TypeScript types/interfaces exported via `src/types/index.ts`

This separation allows for flexible type usage in frontend code without ORM dependencies.

### Application Structure

- **`src/app/`**: Next.js App Router pages and layouts
  - `src/app/api/`: API route handlers (Next.js API routes)
  - Example: `src/app/api/user/route.ts` demonstrates TypeORM repository pattern
- **`src/entities/`**: TypeORM entity definitions with decorators
- **`src/types/`**: TypeScript type definitions
- **`src/lib/`**: Expected location for shared utilities (e.g., `data-source.ts` for TypeORM config)
- **`src/migrations/`**: TypeORM migrations (directory exists in migration commands but not yet created)

### Database Schema

The `schema.sql` file contains the canonical MySQL schema with:
- Foreign key constraints for referential integrity
- JSON columns for card lists (banned, limited, decklists)
- Generated columns for indexing first JSON array elements
- Indexes on foreign keys and commonly queried fields

### Docker Configuration

**Two-container setup**:
1. **MySQL container** (`mysql_db_dev`): Port 3306, initializes with `schema.sql`
2. **Next.js container** (`next_app_dev`): Port 3000, volume-mounted for hot reload

The dev configuration (`docker-compose.dev.yml`) mounts the entire project directory excluding `node_modules`, enabling instant code changes without rebuilds.

## Important Configuration Details

### TypeScript
- **Decorators enabled**: `experimentalDecorators: true` and `emitDecoratorMetadata: true` required for TypeORM
- **Path aliases**: `@/*` maps to project root
- **`useDefineForClassFields: false`**: Required for TypeORM decorator compatibility

### Environment Variables
- Database credentials in `.env` and `.env.production`
- `NODE_ENV=development` set in dev container
- Reference `docker-compose.dev.yml` for default MySQL credentials

### TypeORM Data Source
The API route at `src/app/api/user/route.ts` references `@/lib/data-source` which should export `AppDataSource` (TypeORM DataSource instance). This file needs to be created with MySQL connection configuration.

## Planned Features (from README)

The application will include these pages/features:
- Central home page with todo list and upcoming session info
- Admin page for player management and session control
- Stats browsing page
- Deck submission and validation pages
- Banlist submission and voting pages
- Pairings display and results submission
- Standings page with custom algorithm

Future services planned:
- Discord bot for posting pairings/standings
- Banlist image generator for voted results

## Development Notes

- **Git hooks**: Husky is configured (`npm run prepare`) for pre-commit hooks
- **lint-staged**: Likely configured for pre-commit linting (check `.husky/` directory)
- **Turbopack**: Next.js uses Turbopack for faster builds (`--turbopack` flag in build/dev scripts)
- **Card data caching**: README mentions need to cache Yu-Gi-Oh API results for card images

## Missing Components

When setting up TypeORM integration, you'll need to create:
1. `src/lib/data-source.ts`: TypeORM DataSource configuration with MySQL connection
2. `src/migrations/`: Directory for generated migrations
3. Environment variable validation/loading mechanism

## API Pattern

API routes should follow the pattern in `src/app/api/user/route.ts`:
1. Initialize AppDataSource if not already initialized
2. Get repository from AppDataSource
3. Perform database operations
4. Return NextResponse.json()
