# --- Stage 1: Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install dependencies (Next.js compilation needs devDependencies)
RUN npm ci

# Copy codebase
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Compile Next.js build
RUN npm run build

# --- Stage 2: Run Stage ---
FROM node:22-alpine

WORKDIR /usr/src/app

# Copy dependency manifest
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled Next.js build from builder
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run Next.js server
CMD ["npm", "run", "start"]
