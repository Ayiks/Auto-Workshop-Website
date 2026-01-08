FROM node:22-alpine
WORKDIR /app

# Install necessary system libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application
COPY . . 

EXPOSE 5000

# Ensure the database is ready before starting
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
