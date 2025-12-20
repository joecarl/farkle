FROM node:24-alpine

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy server package files
COPY server/package*.json ./
RUN npm install

# Copy server source code
COPY server/ .

EXPOSE 3000
CMD ["npm", "start"]
