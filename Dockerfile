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

# Expose application port (make sure it matches your app PORT)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]

