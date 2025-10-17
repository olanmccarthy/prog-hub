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

**Note**: TypeORM data source is configured in `src/lib/data-source.ts` with a singleton pattern via `getDataSource()`.

## Architecture

### Data Model

The application uses TypeORM entities that map to MySQL tables defined in `schema.sql`. The data model centers around progression "sessions" (tournaments):

**Core Entities** (in `src/entities/`):
- **Player**: Tournament participants with authentication (name, password, isAdmin)
- **Session**: A progression tournament event with top 6 placements stored as nullable integers (first through sixth)
- **Decklist**: Player's deck for a session (maindeck, sidedeck, extradeck as JSON string arrays, submittedAt timestamp)
- **Banlist**: Card restrictions for a session (banned, limited, semilimited, unlimited as JSON arrays)
- **BanlistSuggestion**: Player-submitted banlist changes for voting
- **BanlistSuggestionVote**: Votes on banlist suggestions
- **Pairing**: Match pairings for each round of a session with win counts
- **VictoryPoint**: Victory points awarded to players per session

**Key Relationships**:
- Sessions store top 6 placements as nullable integer foreign keys (not relations)
- Decklists belong to both a Player and a Session with a submittedAt timestamp
- Banlists belong to Sessions and have many BanlistSuggestions
- Pairings link two players (player1, player2) with win counts for a specific session/round

**Important TypeORM Notes**:
- Use `find()` with `take: 1` instead of `findOne()` when ordering without a where clause
- All `findOne()` calls must include a `where` clause to avoid TypeORM errors
- Session placement fields are stored as nullable integers, not Player relations

### Type System

**Dual Type Approach**: The codebase maintains both TypeORM entities and separate TypeScript type definitions:
- **Entities** (`src/entities/*.ts`): TypeORM decorators for database mapping
- **Types** (`src/types/*.ts`): Plain TypeScript types/interfaces exported via `src/types/index.ts`

This separation allows for flexible type usage in frontend code without ORM dependencies.

### Application Structure

- **`src/app/`**: Next.js App Router pages and layouts
  - `src/app/api/auth/login/`: Authentication API route
  - `src/app/admin/`: Admin-only pages (player management, prog actions)
  - `src/app/play/`: Player pages (pairings, standings, decklist submission)
  - Each page directory contains an `actions.ts` file with server actions
- **`src/entities/`**: TypeORM entity definitions with decorators
- **`src/types/`**: TypeScript type definitions
- **`src/lib/`**: Shared utilities
  - `auth.ts`: Session-based authentication using cookies
  - `ydkParser.ts`: Yu-Gi-Oh .ydk deck file parser and validator
  - `deckValidator.ts`: Deck validation against banlist restrictions
  - `data-source.ts`: TypeORM DataSource configuration with singleton pattern
- **`src/components/`**: Shared React components (AppHeader, YdkUploadBox)

### Database Schema

The `schema.sql` file contains the canonical MySQL schema with:
- Foreign key constraints for referential integrity
- JSON columns for card lists (banned, limited, decklists)
- Generated columns for indexing first JSON array elements
- Indexes on foreign keys and commonly queried fields

### Docker Configuration

**Two-container setup**:
1. **MySQL container** (`mysql_db_dev` for dev, `mysql_db_prod` for prod): Port 3306, initializes with `schema.sql` and `test_data.sql` (dev only)
2. **Next.js container** (`next_app_dev` for dev, `next_app_prod` for prod): Port 3000, volume-mounted for hot reload in dev

The dev configuration (`docker-compose.dev.yml`) mounts the entire project directory excluding `node_modules`, enabling instant code changes without rebuilds.

**Connecting to containers**:
```bash
# Connect to Next.js app container
docker exec -it next_app_dev /bin/sh

# Connect to MySQL container
docker exec -it mysql_db_dev /bin/bash

# Connect to MySQL database directly
docker exec -it mysql_db_dev mysql -u appuser -p
# Password: apppass
# Then: USE appdb;
```

## Important Configuration Details

### TypeScript
- **Decorators enabled**: `experimentalDecorators: true` and `emitDecoratorMetadata: true` required for TypeORM
- **Path aliases**:
  - `@/*` maps to project root
  - `@entities/*` maps to `src/entities/*`
  - `@lib/*` maps to `src/lib/*`
  - `@components/*` maps to `src/components/*`
  - `@types/*` maps to `src/types/*`
- **`useDefineForClassFields: false`**: Required for TypeORM decorator compatibility

### Environment Variables
- Database credentials in `.env` (dev) and `.env.production` (prod)
- All environments use standardized `DB_*` variable names:
  - `DB_HOST`: Database host (default: `db` for Docker)
  - `DB_PORT`: Database port (default: `3306`)
  - `DB_USER`: Database user (default: `appuser`)
  - `DB_PASSWORD`: Database password (default: `apppass` for dev)
  - `DB_NAME`: Database name (default: `appdb`)
  - `MYSQL_ROOT_PASSWORD`: MySQL root password (Docker only, default: `root` for dev)
- `NODE_ENV`: Set to `development` or `production`
- Connection string format: `mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`

### TypeORM Data Source
The file `src/lib/data-source.ts` exports:
- `AppDataSource`: TypeORM DataSource instance with MySQL configuration
- `getDataSource()`: Singleton helper function that initializes the connection once and reuses it

**Important**: Always use `getDataSource()` in server actions to avoid multiple connection attempts. Use `AppDataSource` directly in API routes for backward compatibility.

## Implemented Features

### Completed Pages:
- **Homepage**: Deck validator with .ydk upload that checks against the most recent banlist
- **Admin Pages**:
  - Player List: CRUD operations for players (add, rename, delete, change passwords)
  - Prog Actions: Start new prog sessions with validation and round-robin pairing generation
- **Play Pages**:
  - Pairings: View and update match results for the current session
  - Standings: View ranked standings with tiebreakers, finalize standings (admin only)
  - Decklist Submission: Upload .ydk files with validation and submission
- **Authentication**: Session-based login with cookies

### Features Still To Implement:
- Todo list and upcoming session info on homepage
- Stats browsing page
- Banlist submission and voting pages

### Future Services:
- Discord bot for posting pairings/standings
- Banlist image generator for voted results

## Development Notes

- **Git hooks**: Husky is configured (`npm run prepare`) for pre-commit hooks
- **lint-staged**: Likely configured for pre-commit linting (check `.husky/` directory)
- **Turbopack**: Next.js uses Turbopack for faster builds (`--turbopack` flag in build/dev scripts)
- **Card data caching**: README mentions need to cache Yu-Gi-Oh API results for card images

## Code Patterns

### Server Actions Pattern (Preferred)
Server actions are located in `actions.ts` files within page directories:
```typescript
"use server";

import { getDataSource } from "@lib/data-source";
import { Entity } from "@entities/Entity";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export async function myAction(): Promise<Result> {
  try {
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(Entity);
    // Perform operations
    revalidatePath("/relevant/path");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error message" };
  }
}
```

### API Routes Pattern (Legacy)
API routes use `AppDataSource` directly:
```typescript
if (!AppDataSource.isInitialized) {
  await AppDataSource.initialize();
}
const repo = AppDataSource.getRepository(Entity);
```

### Authentication
- Use `getCurrentUser()` from `@lib/auth` in server actions
- Returns `{ playerId, playerName, isAdmin }` or null
- Check `isAdmin` for admin-only operations

### YDK File Parsing
Use the shared parser from `@lib/ydkParser`:
```typescript
import { parseYdkFromFile } from "@lib/ydkParser";
const result = await parseYdkFromFile(file);
// Returns ParsedDeck with maindeck, sidedeck, extradeck as number arrays
```

### Deck Validation
Use the shared validator from `@lib/deckValidator`:
```typescript
import { validateDeckAgainstBanlist, type BanlistData } from "@lib/deckValidator";
const validation = validateDeckAgainstBanlist(maindeck, sidedeck, extradeck, banlist);
// Returns { isLegal: boolean, errors: string[], warnings: string[] }
```

### Reusable Components
- **YdkUploadBox** (`@components/YdkUploadBox`): Reusable .ydk file upload with validation
  - Props: `banlist`, `sessionNumber`, `onValidationComplete`, `showSubmitButton`, `onSubmit`
  - Handles file parsing, deck validation, and optional submission
