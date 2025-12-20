FROM node:24-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

FROM nginx
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./docker/client.nginx.conf /etc/nginx/conf.d/default.conf
