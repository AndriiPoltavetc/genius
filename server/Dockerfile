# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

RUN npm install --workspace=server --workspace=shared

COPY shared/ ./shared/
COPY server/ ./server/

RUN npm run build --workspace=shared
RUN npm run prisma:generate --workspace=server
RUN npm run build --workspace=server

# ---- Production stage ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

RUN npm install --workspace=server --workspace=shared --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY server/prisma ./server/prisma

WORKDIR /app/server

EXPOSE 3001

CMD ["node", "dist/index.js"]
