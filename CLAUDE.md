# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

prog-hub is a web application for managing Yu-Gi-Oh progression series tournaments. The application handles player registration, deck submission, banlist management (voting and suggestions), match pairings, results tracking, and standings calculation.

## Technology Stack

- **Framework**: Next.js 15.5.5 (App Router with Turbopack)
- **Frontend**: React 19.1.0 with Material-UI (@mui/material)
- **Database**: MySQL 8.0
- **ORM**: Prisma 6.17.1
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

### Database Management (Prisma)
```bash
npx prisma generate          # Generate Prisma Client from schema
npx prisma db push           # Push schema changes to database (used in dev)
npx prisma migrate dev       # Create and apply migrations (alternative to db push)
npx prisma studio            # Open Prisma Studio database GUI
```

**Note**: Prisma Client is configured in `src/lib/prisma.ts` with a singleton pattern. The schema is defined in `prisma/schema.prisma`.

## Deployment

The application uses GitHub Actions for automatic deployment to EC2 when changes are pushed to the `main` branch.

### Deployment Files
- **`.github/workflows/deploy.yml`**: GitHub Actions workflow for automatic deployment
- **`deploy.sh`**: Deployment script that runs on EC2 (pull, rebuild, restart)
- **`DEPLOYMENT.md`**: Complete deployment setup guide
- **`.env.production.example`**: Template for production environment variables

### Automatic Deployment (GitHub Actions)
When you push to the `main` branch:
1. GitHub Actions triggers the deployment workflow
2. Connects to EC2 via SSH
3. Pulls latest code
4. Rebuilds Docker containers
5. Restarts the application

**Required GitHub Secrets** (set in repository Settings → Secrets):
- `EC2_SSH_PRIVATE_KEY`: Private SSH key for EC2 access
- `EC2_HOST`: EC2 instance public IP or hostname
- `EC2_USER`: SSH username (typically `ec2-user`)

### Manual Deployment
```bash
# On EC2 instance
cd ~/prog-hub
./deploy.sh

# Or manually:
git pull origin main
npm run docker:down
npm run docker:build
npm run docker:up -d
```

### Monitoring Production
```bash
# Check running containers
docker ps

# View logs
docker logs next_app_prod
docker logs mysql_db_prod

# Follow logs in real-time
docker logs -f next_app_prod
```

**For complete setup instructions**, see `DEPLOYMENT.md`.

## Architecture

### Data Model

The application uses Prisma models defined in `prisma/schema.prisma`. The data model centers around progression "sessions" (tournaments):

**Core Models** (in `prisma/schema.prisma`):
- **Player**: Tournament participants with authentication (name, password, isAdmin)
- **Session**: A progression tournament event with top 6 placements stored as nullable integers (first through sixth)
- **Decklist**: Player's deck for a session (maindeck, sidedeck, extradeck as JSON string arrays, submittedAt timestamp)
- **Banlist**: Card restrictions for a session (banned, limited, semilimited, unlimited as JSON arrays)
- **BanlistSuggestion**: Player-submitted banlist changes for voting (includes moderatorId and chosen flag)
- **BanlistSuggestionVote**: Votes on banlist suggestions
- **Pairing**: Match pairings for each round of a session with win counts
- **VictoryPoint**: Victory points awarded to players per session

**Key Relationships**:
- Sessions store top 6 placements as nullable integer foreign keys (not Prisma relations)
- Decklists belong to both a Player and a Session with a submittedAt timestamp
- Banlists belong to Sessions and have many BanlistSuggestions
- BanlistSuggestions have both a submitting player and an optional moderator
- Pairings link two players (player1, player2) with win counts for a specific session/round

**Important Prisma Notes**:
- All models use camelCase in the schema but map to snake_case in the database via `@map`
- Use `findFirst()` for queries with `orderBy` when you need a single result
- Use `include` to eagerly load relations, `select` to pick specific fields
- Session placement fields are stored as nullable integers, not Player relations

### Type System

**Dual Type Approach**: The codebase maintains both Prisma-generated types and custom TypeScript type definitions:
- **Prisma Types**: Auto-generated from `prisma/schema.prisma` via `npx prisma generate`
- **Custom Types** (`src/types/*.ts`): Plain TypeScript types/interfaces exported via `src/types/index.ts`

This separation allows for flexible type usage in frontend code. Prisma types are available from `@prisma/client`, while custom types provide additional flexibility for API responses and component props.

### Application Structure

- **`src/app/`**: Next.js App Router pages and layouts
  - `src/app/api/auth/`: Authentication routes (login, logout)
  - `src/app/admin/`: Admin-only pages (player management, prog actions)
  - `src/app/play/`: Player pages (pairings, standings, decklist submission)
  - `src/app/banlist/`: Banlist management (suggestions, voting, history)
  - `src/app/stats/`: Stats browsing (placeholder)
  - Each page directory contains an `actions.ts` file with server actions
- **`prisma/schema.prisma`**: Prisma schema defining all data models
- **`src/types/`**: Custom TypeScript type definitions
- **`src/lib/`**: Shared utilities
  - `prisma.ts`: Prisma Client singleton instance
  - `auth.ts`: Session-based authentication using cookies
  - `ydkParser.ts`: Yu-Gi-Oh .ydk deck file parser and validator
  - `deckValidator.ts`: Deck validation against banlist restrictions
- **`src/components/`**: Shared React components (AppHeader, YdkUploadBox)

### Database Schema

The `prisma/schema.prisma` file is the single source of truth for the database schema. It defines:
- All models with field types and attributes
- Relationships using `@relation` directives
- JSON columns for card lists (banned, limited, decklists)
- Indexes using `@@index` for optimized queries
- Database field name mappings via `@map` (camelCase → snake_case)

The legacy `schema.sql` file exists for reference but is not used by Prisma.

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
- **Path aliases**:
  - `@/*` maps to project root
  - `@lib/*` maps to `src/lib/*`
  - `@components/*` maps to `src/components/*`
  - `@types/*` maps to `src/types/*`
- **Strict mode**: Enabled for type safety
- **Prisma types**: Auto-generated in `node_modules/.prisma/client` after running `npx prisma generate`

### Environment Variables
- Database credentials in `.env` (dev) and `.env.production` (prod)
- **Required for Prisma**:
  - `DATABASE_URL`: Full MySQL connection string (format: `mysql://user:password@host:port/database`)
  - Example: `DATABASE_URL=mysql://appuser:apppass@db:3306/appdb`
- **Optional but used for Docker**:
  - `DB_HOST`: Database host (default: `db` for Docker)
  - `DB_PORT`: Database port (default: `3306`)
  - `DB_USER`: Database user (default: `appuser`)
  - `DB_PASSWORD`: Database password (default: `apppass` for dev)
  - `DB_NAME`: Database name (default: `appdb`)
  - `MYSQL_ROOT_PASSWORD`: MySQL root password (Docker only, default: `root` for dev)
- `NODE_ENV`: Set to `development` or `production`
- `NEXT_PUBLIC_API_URL`: Public API URL for client-side requests

### Prisma Client Singleton
The file `src/lib/prisma.ts` exports:
- `prisma`: Singleton PrismaClient instance with logging configuration

**Important**: Always import and use `prisma` from `@lib/prisma` in server actions and API routes. The singleton pattern prevents multiple client instances and connection exhaustion.

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
- **Banlist Pages** (Partial):
  - Suggestion Creation: Submit banlist suggestions with card management UI (✅ Complete)
  - Suggestion History: View previously submitted suggestions (✅ Complete)
  - Current Banlist: View active banlist (⚠️ Stub only)
  - Banlist History: Browse past banlists (⚠️ Stub only)
  - Voting: Vote on banlist suggestions (⚠️ Stub only)
- **Authentication**: Session-based login with cookies

### Features Still To Implement:
- Todo list and upcoming session info on homepage
- Stats browsing page (placeholder exists)
- Complete banlist voting system
- Current banlist and history views

### Future Services:
- Discord bot for posting pairings/standings
- Banlist image generator for voted results

## Development Notes

- **Git hooks**: Husky is configured (`npm run prepare`) for pre-commit hooks
- **lint-staged**: Likely configured for pre-commit linting (check `.husky/` directory)
- **Turbopack**: Next.js uses Turbopack for faster builds (`--turbopack` flag in build/dev scripts)
- **Card data caching**: README mentions need to cache Yu-Gi-Oh API results for card images

## Code Patterns

### Server Actions Pattern
Server actions are located in `actions.ts` files within page directories:
```typescript
"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export async function myAction(): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Use Prisma client directly
    const result = await prisma.model.findMany({
      where: { /* conditions */ },
      include: { /* relations */ },
      orderBy: { /* sorting */ },
    });

    revalidatePath("/relevant/path");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Error message" };
  }
}
```

### Common Prisma Query Patterns
```typescript
// Find many with relations and ordering
const items = await prisma.model.findMany({
  where: { field: value },
  include: { relation: true },
  orderBy: { createdAt: 'desc' },
});

// Find first (equivalent to findOne with ordering)
const item = await prisma.model.findFirst({
  where: { field: value },
  orderBy: { id: 'desc' },
});

// Create with relations
const item = await prisma.model.create({
  data: {
    field: value,
    relation: { connect: { id: relationId } },
  },
  include: { relation: true },
});

// Update
const updated = await prisma.model.update({
  where: { id },
  data: { field: newValue },
});

// Delete
await prisma.model.delete({
  where: { id },
});
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
