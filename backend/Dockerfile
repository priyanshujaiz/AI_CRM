# --- Stage 1: Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Transpile TypeScript to JavaScript
RUN npm run build

# --- Stage 2: Run Stage ---
FROM node:22-alpine

WORKDIR /usr/src/app

# Copy dependency manifest
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy transpiled JS files from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose backend port
EXPOSE 5000

# Set environment defaults
ENV PORT=5000
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "run", "start"]
