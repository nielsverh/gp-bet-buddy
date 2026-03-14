# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.js ./
RUN npm init -y && npm install express

EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.js"]
