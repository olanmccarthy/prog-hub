# Docker Configuration Guide

This project uses separate Docker configurations for development and production environments.

## File Overview

- **`Dockerfile.dev`** - Development environment with hot reload
- **`Dockerfile.prod`** - Optimized production build
- **`docker-compose.dev.yml`** - Development services configuration
- **`docker-compose.yml`** - Production services configuration

## Dockerfile.dev (Development)

**Purpose**: Fast development with hot module replacement (HMR) and Turbopack

**Features**:
- Single-stage build (no optimization needed)
- Installs ALL dependencies including devDependencies
- Volume mounts source code for instant changes
- Uses `npm run dev` with Turbopack for fast rebuilds
- Node modules cached in anonymous volume

**Usage**:
```bash
npm run docker:dev:up
```

**Characteristics**:
- ✅ Fast hot reload
- ✅ Debug-friendly
- ✅ Includes dev tools
- ❌ Larger image size
- ❌ Not optimized for production

## Dockerfile.prod (Production)

**Purpose**: Optimized production deployment

**Features**:
- Multi-stage build (builder + runtime)
- Uses `npm ci` for reproducible installs
- Builds with standard Webpack (no Turbopack for stability)
- Only production dependencies in final image
- Smaller final image size

**Usage**:
```bash
npm run docker:up
```

**Characteristics**:
- ✅ Small image size (~150MB vs ~500MB dev)
- ✅ Production optimized
- ✅ Stable and compatible
- ✅ Fast runtime performance
- ❌ Requires rebuild for code changes

## Why No Turbopack in Production?

Turbopack is currently in beta and not recommended for production builds:
- **Stability**: Can cause build failures in some environments (like EC2)
- **Compatibility**: Uses experimental features that may not work everywhere
- **Recommendation**: Next.js team suggests dev-only usage

The production Dockerfile uses the standard Next.js build process (Webpack) which is:
- Battle-tested and stable
- Works in all environments
- Fully supports all Next.js features

## Docker Compose Configurations

### docker-compose.dev.yml
- Uses `Dockerfile.dev`
- Mounts source code as volume
- Exposes MySQL on port 3306 (for debugging)
- Loads test data automatically
- Uses default dev credentials

### docker-compose.yml
- Uses `Dockerfile.prod`
- No source code mounting
- MySQL not exposed externally
- No test data
- Uses production environment variables from `.env.production`

## Environment Files

- **`.env`** - Development environment variables (optional defaults)
- **`.env.production`** - Production environment variables (required for deployment)

Example `.env.production`:
```env
DB_HOST=db
DB_PORT=3306
DB_USER=appuser
DB_PASSWORD=your_secure_password_here
DB_NAME=appdb
NODE_ENV=production
```

## Commands Reference

### Development
```bash
npm run docker:dev:build    # Build dev images
npm run docker:dev:up       # Start dev containers
npm run docker:dev:down     # Stop dev containers
npm run docker:dev:clean    # Remove all dev resources
```

### Production
```bash
npm run docker:build        # Build production images
npm run docker:up           # Start production containers
npm run docker:down         # Stop production containers
npm run docker:clean        # Remove all production resources
```

### Direct Docker Compose Commands
```bash
# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f

# Production
docker-compose up -d
docker-compose logs -f
```

## Build Process Comparison

### Development Build (`Dockerfile.dev`)
```
1. FROM node:20-alpine
2. COPY package files
3. RUN npm install (all deps)
4. COPY source code
5. CMD npm run dev (with --turbopack)
```

### Production Build (`Dockerfile.prod`)
```
Builder Stage:
1. FROM node:20-alpine AS builder
2. COPY package files
3. RUN npm ci (exact versions)
4. COPY source code
5. RUN npx next build (no turbopack)

Runtime Stage:
1. FROM node:20-alpine
2. COPY built files from builder
3. COPY node_modules from builder
4. CMD npm start
```

## Troubleshooting

### Dev container not hot reloading
- Check volume mounts in `docker-compose.dev.yml`
- Ensure `/app/node_modules` anonymous volume is present
- Verify file changes are not in `.dockerignore`

### Production build fails
- Check `.env.production` exists and has all required variables
- Verify no turbopack flags in build command
- Check Docker and Docker Compose versions

### Database connection issues
- Development: Check port 3306 not in use
- Production: Ensure containers are on same network
- Verify environment variables match in both app and db services

## Security Notes

**Never commit**:
- `.env.production` with real passwords
- Database credentials
- API keys or secrets

**Production checklist**:
- [ ] Change default DB password in `.env.production`
- [ ] Use strong passwords (16+ characters)
- [ ] Don't expose MySQL port externally (remove ports mapping)
- [ ] Use Docker secrets for sensitive data in production
- [ ] Regularly update base images (`docker pull node:20-alpine`)
