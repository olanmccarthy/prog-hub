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
- **Discord Bot**: discord.js for tournament notifications

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
- `DB_PASSWORD`: MySQL database password (injected into .env.production)
- `MYSQL_ROOT_PASSWORD`: MySQL root password (injected into .env.production)
- `DISCORD_BOT_TOKEN`: Discord bot token (injected into .env.production)
- `AWS_ACCESS_KEY_ID`: AWS access key for SQS (injected into .env.production)
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for SQS (injected into .env.production)

**Note**: The deployment workflow uses `sed` to replace specific sensitive fields in `.env.production` with values from GitHub Secrets, keeping non-sensitive values tracked in git.

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
docker logs discord_bot_prod

# Follow logs in real-time
docker logs -f next_app_prod
docker logs -f discord_bot_prod
```

**For complete setup instructions**, see `DEPLOYMENT.md`.

## Architecture

### Data Model

The application uses Prisma models defined in `prisma/schema.prisma`. The data model centers around progression "sessions" (tournaments):

**Core Models** (in `prisma/schema.prisma`):
- **Player**: Tournament participants with authentication (name, password, isAdmin)
- **Session**: A progression tournament event with top 6 placements stored as nullable integers (first through sixth)
- **Decklist**: Player's deck for a session (maindeck, sidedeck, extradeck as JSON string arrays, submittedAt timestamp)
- **Banlist**: Card restrictions for a session (banned, limited, semilimited, unlimited as JSON arrays of card IDs)
- **BanlistSuggestion**: Player-submitted banlist changes for voting (banned, limited, semilimited, unlimited as JSON arrays of card IDs; includes moderatorId and chosen flag)
- **BanlistSuggestionVote**: Votes on banlist suggestions
- **Pairing**: Match pairings for each round of a session with win counts
- **VictoryPoint**: Victory points awarded to players per session
- **Card**: Yu-Gi-Oh card data (11,316 cards with name, type, attribute, property, types, level, atk, def, link, pendulumScale)

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
- **`src/discord/`**: Discord bot service
  - `index.ts`: Bot entry point and service runner
  - `bot.ts`: Discord client initialization and management
  - `config.ts`: Bot configuration and validation
  - `notifications.ts`: Notification functions for pairings, standings, etc.
- **`yugioh_cards.sql`**: SQL dump with CREATE TABLE and 11,316 INSERT statements for Yu-Gi-Oh card data (automatically loaded by MySQL on initialization)

### Database Schema

The `prisma/schema.prisma` file is the single source of truth for the database schema. It defines:
- All models with field types and attributes
- Relationships using `@relation` directives
- JSON columns for card lists (banned, limited, decklists)
- Indexes using `@@index` for optimized queries
- Database field name mappings via `@map` (camelCase → snake_case)

The legacy `schema.sql` file exists for reference but is not used by Prisma.

### Docker Configuration

**Development (two-container setup)**:
1. **MySQL container** (`mysql_db_dev`): Port 3306, automatically loads `yugioh_cards.sql` on initialization (11,316 Yu-Gi-Oh cards)
2. **Next.js container** (`next_app_dev`): Port 3000, volume-mounted for hot reload

**Production (three-container setup)**:
1. **MySQL container** (`mysql_db_prod`): Port 3306, automatically loads `yugioh_cards.sql` on initialization
2. **Next.js container** (`next_app_prod`): Port 3000
3. **Discord Bot container** (`discord_bot_prod`): Notification service that polls SQS queue

The dev configuration (`docker-compose.dev.yml`) mounts the entire project directory excluding `node_modules`, enabling instant code changes without rebuilds. The Discord bot and SQS notifications are disabled in development mode.

**Card Database Initialization**: Both Docker Compose files mount `yugioh_cards.sql` to `/docker-entrypoint-initdb.d/` which MySQL automatically executes on first database initialization. This ensures the `cards` table is always populated with 11,316 Yu-Gi-Oh cards when starting with fresh volumes.

**Connecting to containers**:
```bash
# Development
docker exec -it next_app_dev /bin/sh
docker exec -it mysql_db_dev /bin/bash

# Production
docker exec -it next_app_prod /bin/sh
docker exec -it discord_bot_prod /bin/sh
docker exec -it mysql_db_prod /bin/bash

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
- **Discord Bot Configuration** (optional, bot disabled if not configured):
  - `DISCORD_ENABLED`: Set to `true` to enable bot (default: `false` for dev, `true` for prod)
  - `DISCORD_BOT_TOKEN`: Discord bot token from Discord Developer Portal
  - `DISCORD_GUILD_ID`: Discord server ID where bot will post
  - `DISCORD_CHANNEL_ID`: Channel ID where notifications will be posted
- **AWS SQS Configuration** (required for Discord bot):
  - `AWS_REGION`: AWS region where SQS queue is located (e.g., `us-east-1`)
  - `AWS_ACCESS_KEY_ID`: AWS access key with SQS permissions
  - `AWS_SECRET_ACCESS_KEY`: AWS secret key
  - `DISCORD_SQS_QUEUE_URL`: Full URL of the SQS FIFO queue (e.g., `https://sqs.us-east-1.amazonaws.com/123456789/discord-notifications.fifo`)
  - `SQS_POLL_INTERVAL`: Polling interval in milliseconds (default: `60000` - 1 minute)

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

### Integrated Services:
- **Discord Bot**: Automated notifications for pairings, standings, and new sessions (✅ Implemented)
  - Automatically posts all round pairings when a new session starts via `startProg()` (src/app/admin/prog_actions/actions.ts:310)
  - Automatically posts final standings when an admin finalizes them via `finalizeStandings()` (src/app/play/standings/actions.ts:408)

### Future Services:
- Banlist image generator for voted results

## Development Notes

- **Git hooks**: Husky is configured (`npm run prepare`) for pre-commit hooks
- **lint-staged**: Likely configured for pre-commit linting (check `.husky/` directory)
- **Turbopack**: Next.js uses Turbopack for faster builds (`--turbopack` flag in build/dev scripts)
- **Card data**: 11,316 Yu-Gi-Oh cards are stored in the `cards` table, automatically loaded from `yugioh_cards.sql` on database initialization

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

### Discord Bot Integration

The Discord bot runs as a separate service and can be called from server actions to send notifications.

**Configuration**:
- **Production only**: Discord bot and SQS notifications are disabled in development mode (`NODE_ENV=development`)
- Requires Discord bot token, guild ID, and channel ID from Discord Developer Portal
- Requires AWS SQS FIFO queue and IAM credentials
- Bot runs as a separate Docker container in production only

**Sending Notifications from Server Actions**:
```typescript
import { notifyPairings, notifyStandings, notifyNewSession, notifyGeneric } from '@lib/discordClient';

// After generating pairings for a round
await notifyPairings(sessionId, roundNumber);

// After finalizing standings
await notifyStandings(sessionId);

// When starting a new session
await notifyNewSession(sessionNumber);

// For custom notifications
await notifyGeneric('Tournament Update', 'Custom message here', 0x00ff00);
```

**Architecture**: The Discord bot runs as a separate service with an SQS queue consumer. The Next.js app sends messages to AWS SQS (via `src/lib/discordClient.ts`), and the Discord bot polls the queue to process notifications asynchronously. This decouples the Discord.js library from the Next.js runtime and provides reliable, asynchronous message delivery with automatic retries.

**Available Notification Functions** (in `src/discord/notifications.ts`):
- `notifyNewSessionWithPairings(sessionId: number)`: Posts all pairings for a new session, grouped by round (automatically called in `startProg()`)
- `notifyPairings(sessionId: number, round: number)`: Posts round pairings with player matchups
- `notifyStandings(sessionId: number)`: Posts final standings with rankings and scores
- `notifyNewSession(sessionNumber: number)`: Announces a new session has started (basic version without pairings)
- `notifyGeneric(title: string, description: string, color?: number)`: Posts a custom message

**Setup for Production**:
1. **Create Discord Bot**:
   - Go to https://discord.com/developers/applications
   - Create a new application and bot
   - Copy the bot token
   - Invite bot to your server with "Send Messages" and "Embed Links" permissions
   - Get server ID and channel ID (enable Developer Mode in Discord)

2. **Create AWS SQS FIFO Queue**:
   - Go to AWS SQS Console
   - Create a new FIFO queue named `discord-notifications.fifo`
   - Enable Content-Based Deduplication (recommended)
   - Note the queue URL

3. **Create IAM User with SQS Permissions**:
   - Create IAM user with `AmazonSQSFullAccess` policy (or custom policy with `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`)
   - Generate access key and secret key

4. **Set Environment Variables** in `.env.production`:
   ```
   DISCORD_ENABLED=true
   DISCORD_BOT_TOKEN=your_bot_token
   DISCORD_GUILD_ID=your_server_id
   DISCORD_CHANNEL_ID=your_channel_id

   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   DISCORD_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/discord-notifications.fifo
   ```

5. **Deploy**:
   - Restart containers with `npm run docker:build && npm run docker:up`

**Important Notes**:
- **Production only**: Notifications are automatically skipped in development mode
- Notifications are sent asynchronously via SQS; sending failures are logged but don't block server actions
- Bot must be running and polling the queue for notifications to be processed
- SQS provides automatic retries for failed messages
- All notifications use Discord embeds for rich formatting
- The bot only sends messages; it does not respond to commands
- Uses AWS SQS FIFO queue to ensure messages are processed in order
