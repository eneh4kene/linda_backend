# Dockerfile for Linda Backend
FROM node:20-alpine

# Install system dependencies including OpenSSL for Prisma
RUN apk add --no-cache ffmpeg openssl libc6-compat

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Typescript files
RUN npm run build

# Expose application port
EXPOSE 3000

# Push schema to database and start the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]

