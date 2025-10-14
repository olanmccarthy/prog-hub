# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only package files and install
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# --- Production stage ---
FROM node:20-alpine
WORKDIR /app

# Copy package.json for metadata (optional)
COPY package*.json ./

# Copy the built app and node_modules from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Expose and start
EXPOSE 3000
CMD ["npm", "start"]
