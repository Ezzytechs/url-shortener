# ==========================================
# STAGE 1: Build & Compile Stage
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency manifest files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL packages including development tools
RUN npm ci

# Bake the Prisma binaries safely into the image layer during build time
RUN npx prisma generate

# Copy application code and compile TypeScript to JavaScript
COPY . .
RUN npm run build

# Prune development packages to leave only production nodes
RUN npm prune --production

# ==========================================
# STAGE 2: Lightweight Production Runner Stage
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy over only the structural production assets needed
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./prisma.config.js

# Expose production engine networking port
EXPOSE 8080

# Run schema migrations locally and start the server
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]