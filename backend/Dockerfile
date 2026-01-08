# Stage 1: Build dependencies
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
