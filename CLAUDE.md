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
- **Session**: A progression tournament event. Pre-populated from sets marked as is_a_session. Fields: number (unique), date (nullable, set when activated), setId (FK to Set), complete (boolean), active (boolean), eventWheelSpun (boolean), victoryPointsAssigned (boolean), walletPointsAssigned (boolean), moderatorId (nullable integer), placements (first-sixth as nullable integers)
- **Decklist**: Player's deck for a session (maindeck, sidedeck, extradeck as JSON string arrays, submittedAt timestamp)
- **Banlist**: Card restrictions for a session (sessionId stores session number, not id; banned, limited, semilimited, unlimited as JSON arrays of card IDs)
- **BanlistSuggestion**: Player-submitted banlist changes for voting (banned, limited, semilimited, unlimited as JSON arrays of card IDs; includes moderatorId and chosen flag)
- **BanlistSuggestionVote**: Votes on banlist suggestions
- **Pairing**: Match pairings for each round of a session with win counts
- **VictoryPoint**: Victory points awarded to players per session
- **Wallet**: Player wallet tracking funds (playerId unique FK, amount integer; automatically created/deleted with player)
- **WalletTransaction**: Detailed transaction log for wallets (walletId, sessionId, amount, type, description, createdAt) - tracks VICTORY_POINT_AWARD, SHOP_PURCHASE, MANUAL_ADJUSTMENT types
- **WalletPointBreakdown**: Defines wallet point distribution for top 6 placements (first through sixth as integers, active boolean) - only one breakdown can be active at a time
- **Transaction**: Player spending history (playerId, setId, amount, date with default now()) - legacy/simplified transaction tracking
- **EventWheelEntry**: Event wheel outcomes (name, description, chance) - configurable events that can occur at the start of a session
- **LoserPrizingEntry**: Loser prizing outcomes (name, description, chance) - configurable consolation prizes for lower placements
- **Card**: Yu-Gi-Oh card data (11,316 cards with name, type, attribute, property, types, level, atk, def, link, pendulumScale)
- **Set**: Yu-Gi-Oh set/product data (1,004 sets with setName, setCode, numOfCards, tcgDate, setImage, isASession, isPurchasable, isPromo; indexed on setCode and tcgDate)

**Key Relationships**:
- **Sessions**: Pre-populated from Sets where is_a_session=true. Link to Set via setId. Only one session can be active at a time
- **Sessions → Players**: Store top 6 placements as nullable integer foreign keys (not Prisma relations)
- **Decklists**: Belong to both a Player and a Session with a submittedAt timestamp
- **Banlists**: Reference Sessions via sessionId which stores the session **number** (not id), with no foreign key constraint. This allows banlists to be created for future sessions before they are activated
- **BanlistSuggestions**: Have both a submitting player and an optional moderator
- **Pairings**: Link two players (player1, player2) with win counts for a specific session/round
- **Wallets**: One-to-one relationship with Player. Automatically created when player is created (with amount=0), automatically deleted when player is deleted (onDelete: Cascade)
- **WalletTransactions**: Many-to-one with Wallet and optional Session. Cascade delete with wallet. Tracks all wallet balance changes
- **Transactions**: Many-to-one with both Player and Set. Tracks player spending on sets with timestamp (legacy system)

**Important Prisma Notes**:
- All models use camelCase in the schema but map to snake_case in the database via `@map`
- **Session Lifecycle**: Sessions are pre-populated on database init. Use `where: { active: true }` to get current session, `where: { complete: false }` for upcoming sessions
- **Banlist.sessionId**: Stores the session **number** (not the auto-incremented id) and has no foreign key constraint. Always query with `where: { sessionId: session.number }`
- Use `findFirst()` for queries that need a single result
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
  - `src/app/admin/`: Admin-only pages
    - `player-list/`: Player management (CRUD operations)
    - `set-manager/`: Set metadata management
    - `prog_actions/`: Session management (start/complete sessions)
    - `event-wheel/`: Event wheel spinning for session events
    - `victory-point-assignment/`: Victory point passdown system
    - `loser-prizing/`: Loser prizing wheel for consolation prizes
    - `moderator-selection/`: Random moderator selection with eligibility controls
  - `src/app/play/`: Player pages (pairings, standings, decklist submission)
  - `src/app/banlist/`: Banlist management (suggestions, voting, history)
  - `src/app/shop/`: Browse and purchase sets with wallet points
  - `src/app/leaderboard/`: View Victory Point and Wallet rankings
  - `src/app/stats/`: Stats browsing (placeholder)
  - **IMPORTANT**: Each page directory should contain exactly ONE `actions.ts` file with ALL server actions for that page
    - Never create multiple action files (e.g., `actions.ts` and `other-actions.ts`) in the same directory
    - If a page needs actions from different domains, organize them with comments in a single `actions.ts` file
    - Example: `src/app/play/pairings/actions.ts` contains both pairing and standings actions, clearly separated by comments
- **`prisma/schema.prisma`**: Prisma schema defining all data models
- **`src/types/`**: Custom TypeScript type definitions
- **`src/lib/`**: Shared utilities
  - `prisma.ts`: Prisma Client singleton instance
  - `auth.ts`: Session-based authentication using cookies
  - `ydkParser.ts`: Yu-Gi-Oh .ydk deck file parser and validator
  - `deckValidator.ts`: Deck validation against banlist restrictions
- **`src/components/`**: Shared React components
  - `AppHeader.tsx`: Navigation header with authentication
  - `YdkUploadBox.tsx`: Reusable deck upload and validation component
  - `EventWheel.tsx`: Canvas-based spinning wheel component with animation
  - `EventResultModal.tsx`: Modal for displaying wheel spin results
- **`src/discord/`**: Discord bot service
  - `index.ts`: Bot entry point and service runner
  - `bot.ts`: Discord client initialization and management
  - `config.ts`: Bot configuration and validation
  - `notifications.ts`: Notification functions for pairings, standings, etc.
- **`data/`**: Data files directory
  - `yugioh_cards.sql`: SQL dump with 11,316 Yu-Gi-Oh cards (auto-loaded on MySQL init)
  - `yugioh_sets.sql`: SQL dump with 1,004 Yu-Gi-Oh sets (auto-loaded on MySQL init)
  - `new_sets.sql`: Updated set data with latest releases (replaces yugioh_sets.sql in some contexts)
  - `yugioh_sessions.sql`: Pre-populates 27 sessions from sets marked as is_a_session (auto-loaded on MySQL init)
  - `wallet_point_breakdowns.sql`: Pre-populates wallet point distribution schemes (auto-loaded on MySQL init)
  - `testdata.sql`: Test data (6 players: olan as admin, coog, costello, jason, kris, vlad - all password "123"; empty banlist for session 1) (auto-loaded on MySQL init)
  - `card_sets.json`: Source JSON for set data
  - `testdeck.ydk`, `testdeck2.ydk`: Example deck files for testing
- **`architecture/`**: Architecture documentation
  - `action_flow.md`: Detailed step-by-step session lifecycle and workflow

### Database Schema

The `prisma/schema.prisma` file is the single source of truth for the database schema. It defines:
- All models with field types and attributes
- Relationships using `@relation` directives
- JSON columns for card lists (banned, limited, decklists)
- Indexes using `@@index` for optimized queries
- Database field name mappings via `@map` (camelCase → snake_case)

### Docker Configuration

**Development (two-container setup)**:
1. **MySQL container** (`mysql_db_dev`): Port 3306, automatically loads SQL files from `data/` folder on initialization
2. **Next.js container** (`next_app_dev`): Port 3000, volume-mounted for hot reload

**Production (three-container setup)**:
1. **MySQL container** (`mysql_db_prod`): Port 3306, automatically loads SQL files from `data/` folder on initialization
2. **Next.js container** (`next_app_prod`): Port 3000
3. **Discord Bot container** (`discord_bot_prod`): Notification service that polls SQS queue

The dev configuration (`docker-compose.dev.yml`) mounts the entire project directory excluding `node_modules`, enabling instant code changes without rebuilds. The Discord bot and SQS notifications are disabled in development mode.

**Database Initialization**: Both Docker Compose files mount data files to `/docker-entrypoint-initdb.d/` which MySQL automatically executes on first database initialization in alphabetical order:
1. `01_yugioh_cards.sql`: Populates cards table with 11,316 Yu-Gi-Oh cards
2. `02_yugioh_sets.sql` (or `02_new_sets.sql`): Populates sets table with 1,004+ sets (27 marked as is_a_session=true)
3. `03_yugioh_sessions.sql`: Pre-populates all 27 sessions from sets marked as is_a_session (all start as complete=false, active=false, eventWheelSpun=false, victoryPointsAssigned=false, walletPointsAssigned=false)
4. `04_wallet_point_breakdowns.sql`: Pre-populates wallet point distribution schemes
5. `05_testdata.sql`: Test data (6 players, empty banlist for session 1)

This ensures all data is ready when starting with fresh volumes.

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

## Session Lifecycle

Sessions are pre-populated on database initialization from sets marked as `is_a_session=true` (27 total). The complete lifecycle is documented in `architecture/action_flow.md` and follows these steps:

### Detailed Session Flow

1. **Pre-populated State**: All sessions exist with `complete=false`, `active=false`, `eventWheelSpun=false`, `victoryPointsAssigned=false`, `walletPointsAssigned=false`. Session 1 has an empty default banlist.

2. **Banlist Creation**: Admins create a banlist for the next session (banlist.sessionId = session.number)

3. **Start Session**: Admin starts the session via Session Management page (`/admin/prog_actions`)
   - Sets `active=true` and `date=NOW()`
   - Ready for player decklist submissions

4. **Decklist Submission**: All players must submit their decklists for the session (`/play/decklist`)
   - Validates against active session's banlist
   - Required before event wheel can be spun

5. **Event Wheel**: Admin spins the event wheel (`/admin/event-wheel`)
   - All decklists must be submitted first
   - Randomly selects an event from `EventWheelEntry` table based on chance percentages
   - Sets `eventWheelSpun=true` on session
   - Event affects the tournament rules/gameplay

6. **Pairings Generation**: Pairings are generated after event wheel is spun
   - Generates round-robin pairings for all players
   - Sends Discord notification with all pairings

7. **Match Play & Reporting**: Players play matches on Dueling Book and report scores (`/play/pairings`)
   - Update win counts for each pairing
   - Continue until all matches are complete

8. **Finalize Standings**: Admin finalizes standings (`/play/standings`)
   - Calculates final rankings with tiebreakers (Match Wins → Game Wins → OMW%)
   - Populates session placement fields (first through sixth)
   - Sends Discord notification with final standings

9. **Victory Point Assignment**: Admin assigns victory points via passdown system (`/admin/victory-point-assignment`)
   - Starting from 1st place, each player is offered the victory point
   - If they take it: they get 1 VP, others get wallet points based on placement
   - If they pass: offer moves to next player in rankings
   - Last place must accept if everyone passes
   - Sets `victoryPointsAssigned=true` on session

10. **Wallet Point Distribution**: System automatically distributes wallet points
    - Uses active `WalletPointBreakdown` to determine point distribution
    - Creates `WalletTransaction` records of type "VICTORY_POINT_AWARD"
    - Last place receives no wallet points
    - Sets `walletPointsAssigned=true` on session

11. **Decklists Made Public**: Decklists become viewable by all players after standings are finalized

12. **Banlist Suggestions**: Players submit their banlist suggestions for the next session (`/banlist/suggestion`)
    - Must submit changes in JSON format (banned, limited, semilimited, unlimited arrays)
    - All players must submit before proceeding

13. **Banlist Voting**: Players vote on submitted banlist suggestions (`/banlist/voting`)
    - Each player must cast minimum 2 votes
    - Cannot vote for their own suggestion
    - All players must vote before moderator can be selected

14. **Moderator Selection**: Admin randomly selects moderator via wheel (`/admin/moderator-selection`)
    - Admin selects eligible players (all by default except last session's moderator)
    - Each eligible player has equal chance of being chosen
    - Sets `moderatorId` on session
    - **Validation**: All players must have voted on banlist suggestions
    - **Requirement**: Must be completed before session can be marked complete

15. **Moderator Chooses Banlist**: Moderator selects winning banlist suggestion (`/banlist/voting`)
    - Only the selected moderator can access this functionality
    - Moderator views all suggestions that received 2+ votes
    - Selects winning suggestion with crown icon and confirms
    - Automatically creates new `Banlist` entry for next session (sessionId + 1)
    - Merges winning suggestion with current banlist:
      - Cards in suggestion move to new categories
      - Cards not mentioned stay in current categories
      - New cards from suggestion are added
    - Sets `chosen=true` on selected suggestion
    - Moderator can change selection before session completion

16. **Complete Session**: Admin completes the session (`/admin/prog_actions`)
    - Verifies all requirements are met:
      - All placements (1st-6th) filled ✅
      - All decklists submitted ✅
      - Event wheel spun ✅
      - Victory points assigned ✅
      - Wallet points assigned ✅
      - All banlist suggestions submitted ✅
      - Moderator selected ✅
      - (Future: Winning banlist confirmed)
    - Sets `complete=true` and `active=false`

17. **Repeat**: Next session (lowest number where complete=false) becomes available to start

### Additional Features

- **Loser Prizing Wheel** (`/admin/loser-prizing`): Can be spun multiple times to award consolation prizes to players who didn't place in top 6
- **Shop** (`/shop`): Players can spend wallet points on purchasable sets released before the next session
- **Leaderboard** (`/leaderboard`): View rankings by Victory Points or Wallet balances

**Query Patterns**:
- Active session: `prisma.session.findFirst({ where: { active: true } })`
- Next session to start: `prisma.session.findFirst({ where: { complete: false }, orderBy: { number: 'asc' } })`
- Upcoming sessions: `prisma.session.findMany({ where: { complete: false }, orderBy: { number: 'asc' } })`

## Event & Prizing System

### Event Wheel
The event wheel introduces random events that affect each session:
- **Configuration**: Events are stored in the `EventWheelEntry` table with name, description, and chance (percentage)
- **Triggering**: After all players submit decklists, admin spins the event wheel once per session
- **Weighted Random**: Each entry has a chance percentage (e.g., 20% for "Draft Event")
- **No Event Option**: If total chances < 100%, remainder is "No Event" (tournament proceeds normally)
- **One-Time**: Can only be spun once per session (tracked by `eventWheelSpun` flag)
- **Examples**: Draft format, bonus packs, special rules, etc.

### Loser Prizing Wheel
The loser prizing wheel provides consolation prizes for players who didn't place in top 6:
- **Configuration**: Prizes are stored in the `LoserPrizingEntry` table with name, description, and chance
- **Multi-Spin**: Can be spun multiple times (no session tracking)
- **Weighted Random**: Works same as event wheel with percentage-based selection
- **Use Case**: Award random prizes to lower-placing players after the session
- **Examples**: Bonus packs, store credit, small prizes

### Wheel Implementation
Both wheels use the same `EventWheel` component:
- Canvas-based spinning animation with smooth easing
- Segments colored using CSS variables (`--wheel-color-1` through `--wheel-color-8`)
- Server-side selection ensures fair randomization
- Result displayed in modal with option to spin again (if allowed)

## Victory Point & Wallet System

### Victory Points
- Players earn victory points through the passdown system after each session
- Only 1 victory point is awarded per session
- The player who accepts the victory point receives 1 VP added to their total
- Victory points are tracked in the `VictoryPoint` model (one record per VP awarded)
- Leaderboard displays total victory points across all sessions

### Wallet Points (Dollarydoos)
- Players earn wallet points when someone else takes the victory point
- Distribution is based on the active `WalletPointBreakdown` configuration
- Example breakdown: 1st place gets X points, 2nd gets Y points, etc.
- Last place (6th) receives no wallet points regardless of who takes VP
- Wallet points are stored in the `Wallet` model (current balance)
- All changes are logged in `WalletTransaction` with type and description
- Players can spend wallet points in the Shop on purchasable sets

### Passdown System
The victory point passdown system works as follows:
1. After standings are finalized, admin goes to Victory Point Assignment page
2. Starting with 1st place, each player is offered the victory point
3. Options:
   - **Take VP**: Player receives 1 victory point, all others (except last place) receive wallet points based on placement
   - **Pass**: Offer moves to next player in the rankings
4. If all players pass, last place automatically receives the victory point
5. Once assigned, both `victoryPointsAssigned` and `walletPointsAssigned` are set to true on the session

### Wallet Transactions
All wallet changes are tracked with:
- **Type**: "VICTORY_POINT_AWARD", "SHOP_PURCHASE", "MANUAL_ADJUSTMENT"
- **Amount**: Positive for credits, negative for debits
- **Session**: Optional link to the session that triggered the transaction
- **Description**: Human-readable explanation of the transaction

## Implemented Features

### Completed Pages:
- **Homepage**: Deck validator with .ydk upload that checks against the active session's banlist, upcoming session navigator (✅ Complete)
- **Admin Pages**:
  - Player List: CRUD operations for players (add, rename, delete, change passwords) (✅ Complete)
  - Set Manager: Manage set metadata (is_a_session, is_purchasable, is_promo) (✅ Complete)
  - Session Management: Start and complete sessions with validation checks (✅ Complete)
  - Event Wheel: Spin event wheel with configurable outcomes and percentages (✅ Complete)
  - Victory Point Assignment: Passdown system for victory point distribution (✅ Complete)
  - Loser Prizing: Repeatable wheel for consolation prizes (✅ Complete)
- **Play Pages**:
  - Pairings: View and update match results for the current session (✅ Complete)
  - Standings: View ranked standings with tiebreakers, finalize standings (admin only) (✅ Complete)
  - Decklist Submission: Upload .ydk files with validation and submission (✅ Complete)
  - Decklists: View submitted decklists with filters for session/player; current session hidden until standings finalized (✅ Complete)
- **Banlist Pages**:
  - Suggestion Creation: Submit banlist suggestions with card management UI (✅ Complete)
  - Suggestion History: View previously submitted suggestions (✅ Complete)
  - Voting: Vote on banlist suggestions with thumbs up icons (✅ Complete)
  - Moderator Banlist Choice: Interface for moderator to choose winning suggestion with crown icons (✅ Complete)
  - Current Banlist: View active banlist (⚠️ Stub only)
  - Banlist History: Browse past banlists (⚠️ Stub only)
- **Admin Pages (Banlist)**:
  - Moderator Selection: Random wheel selection with player eligibility controls (✅ Complete)
- **Shop**: Browse and view purchasable sets released before the next session (✅ Complete)
- **Leaderboard**: View rankings by Victory Points or Wallet balances with toggle view (✅ Complete)
- **Authentication**: Session-based login with cookies (✅ Complete)

### Features Still To Implement:
- Todo list and upcoming session info on homepage
- Stats browsing page (placeholder exists)
- Current banlist and history views
- Event wheel entry management (add/edit/delete entries)
- Loser prizing entry management (add/edit/delete entries)
- Wallet point breakdown management (add/edit/set active breakdown)
- Validation to check if winning banlist has been confirmed before completing session

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
- **Card data**: 11,316 Yu-Gi-Oh cards stored in the `cards` table, automatically loaded from `data/yugioh_cards.sql` on database initialization
- **Set data**: 1,004+ Yu-Gi-Oh sets stored in the `sets` table (27 marked as is_a_session), automatically loaded from `data/yugioh_sets.sql` or `data/new_sets.sql` on database initialization
- **Session data**: 27 pre-populated sessions from sets marked as is_a_session, automatically loaded from `data/yugioh_sessions.sql` on database initialization
- **Wallet breakdowns**: Pre-configured wallet point distribution schemes, automatically loaded from `data/wallet_point_breakdowns.sql` on database initialization
- **Test data**: 6 players (olan as admin, coog, costello, jason, kris, vlad - all password "123") and empty banlist for session 1, automatically loaded from `data/testdata.sql` on database initialization
- **Event/Prizing Data**: EventWheelEntry and LoserPrizingEntry tables can be manually populated or managed through future admin interfaces

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
- **EventWheel** (`@components/EventWheel`): Canvas-based spinning wheel with animation
  - Props: `segments` (array of {name, description, weight, color}), `onSpinComplete`, `spinning`
  - Uses HTML5 Canvas for rendering, CSS variables for colors
  - Handles weighted random selection and smooth rotation animation
- **EventResultModal** (`@components/EventResultModal`): Modal for displaying wheel spin results
  - Props: `open`, `onClose`, `onSpinAgain`, `result`, `alreadySpun`
  - Shows selected outcome with option to spin again (if allowed)

### Styling and Color Management

**IMPORTANT**: All colors and styling variables must be defined in global CSS, not inline.

The project uses a centralized color system defined in `src/app/globals.css`:

**Available CSS Variables**:
```css
/* Background colors */
--bg-primary: #1e1e1e         /* Main background */
--bg-secondary: #252526       /* Sidebar, elevated surfaces */
--bg-tertiary: #2d2d30        /* Hover states, borders */
--bg-elevated: #2d2d2d        /* Cards, panels */

/* Text colors */
--text-primary: #ffffff       /* Main text */
--text-secondary: #858585     /* Secondary text, disabled */
--text-bright: #ffffff        /* Emphasized text */

/* Accent colors */
--accent-primary: #007acc     /* Primary accent - links, buttons */
--accent-secondary: #1a8fd9   /* Secondary accent */
--accent-blue: #007acc        /* Primary accent (legacy alias) */
--accent-blue-hover: #1a8fd9  /* Hover state */
--accent-blue-dark: #005a9e   /* Active/pressed state */

/* Hover states */
--hover-light-grey: rgba(255, 255, 255, 0.15)  /* Light grey overlay for button hovers */

/* UI element colors */
--border-color: #3e3e42       /* Borders, dividers */
--input-bg: #3c3c3c           /* Input fields */
--input-border: #3e3e42       /* Input borders */

/* Status colors */
--success: #4ec9b0            /* Success states */
--warning: #dcdcaa            /* Warning states */
--error: #f48771              /* Error states */
--info: #75beff               /* Info states */

/* Wheel colors (for EventWheel component) */
--wheel-color-1 through --wheel-color-8  /* Rainbow colors for wheel segments */

/* Badge colors */
--grey-badge: [color value]   /* Grey badge background */
--grey-300: [color value]     /* Disabled button background */
```

**When adding new colors**:
1. Add the color to `src/app/globals.css` with a descriptive variable name
2. Include a comment explaining its purpose
3. Use `var(--variable-name)` in component styles
4. **Never** use inline color values (hex, rgb, rgba) directly in components

**Example**:
```typescript
// ❌ BAD - inline color
sx={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}

// ✅ GOOD - using CSS variable
sx={{ backgroundColor: 'var(--hover-light-grey)' }}
```

**Material-UI Integration**:
- Use MUI theme colors when appropriate: `primary.main`, `primary.contrastText`
- For custom colors, always use CSS variables from globals.css
- Avoid mixing MUI theme colors with inline hex/rgb values

### Discord Bot Integration

The Discord bot runs as a separate service and can be called from server actions to send notifications.

**Configuration**:
- **Production only**: Discord bot and SQS notifications are disabled in development mode (`NODE_ENV=development`)
- Requires Discord bot token, guild ID, and channel ID from Discord Developer Portal
- Requires AWS SQS FIFO queue and IAM credentials
- Bot runs as a separate Docker container in production only

**Sending Notifications from Server Actions**:
```typescript
import { notifyPairings, notifyStandings, notifyNewSession, notifyBanlistChosen, notifyBanlistSuggestions, notifyLeaderboard, notifyWalletUpdate, notifyTransaction, notifyDecklists } from '@lib/discordClient';

// After generating pairings for a round
await notifyPairings(sessionId, roundNumber);

// After finalizing standings
await notifyStandings(sessionId);

// After generating decklist images
await notifyDecklists(sessionId);

// When starting a new session
await notifyNewSession(sessionNumber);

// When banlist is chosen by moderator
await notifyBanlistChosen(sessionId);

// When all banlist suggestions are submitted
await notifyBanlistSuggestions(sessionId);

// When victory points are assigned
await notifyLeaderboard(sessionId);

// When wallet points are distributed
await notifyWalletUpdate(sessionId);

// When a player makes a purchase
await notifyTransaction(playerId, setId, amount, sessionId);
```

**Architecture**: The Discord bot runs as a separate service with an SQS queue consumer. The Next.js app sends messages to AWS SQS (via `src/lib/discordClient.ts`), and the Discord bot polls the queue to process notifications asynchronously. This decouples the Discord.js library from the Next.js runtime and provides reliable, asynchronous message delivery with automatic retries.

**Available Notification Functions** (in `src/discord/notifications.ts`):
- `notifyNewSessionWithPairings(sessionId: number)`: Posts all pairings for a new session, grouped by round (automatically called in `startProg()`) → sent to **pairings** channel
- `notifyPairings(sessionId: number, round: number)`: Posts round pairings with player matchups → sent to **pairings** channel
- `notifyStandings(sessionId: number)`: Posts final standings with rankings and scores → sent to **standings** channel
- `notifyDecklists(sessionId: number)`: Posts each player's decklist as a separate message with image (automatically called after `finalizeStandings()`). Fetches images from web URL using `NEXT_PUBLIC_API_URL` → sent to **decklists** channel
- `notifyNewSession(sessionNumber: number)`: Announces a new session has started (basic version without pairings) → sent to **pairings** channel
- `notifyBanlistChosen(sessionNumber: number)`: Posts the chosen banlist with changes highlighted → sent to **banlist** channel
- `notifyBanlistSuggestions(sessionId: number)`: Posts all submitted banlist suggestions → sent to **banlistSuggestions** channel
- `notifyLeaderboard(sessionId: number)`: Posts updated victory point leaderboard → sent to **leaderboard** channel
- `notifyWalletUpdate(sessionId: number)`: Posts updated wallet balances for all players → sent to **wallet** channel
- `notifyTransaction(playerId: number, setId: number, amount: number, sessionId?: number)`: Posts a player's purchase → sent to **spending** channel

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
- **Decklist images**: The `notifyDecklists()` function fetches decklist images from `${NEXT_PUBLIC_API_URL}/deck-images/{decklistId}.png` to work with containerized services. The Discord bot container must have network access to the Next.js app URL
