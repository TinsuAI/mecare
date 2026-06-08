# MeCare zalo-bridge (Node TS) — Story 1.1 stub
FROM node:20-alpine

WORKDIR /app

# Install deps (tsx is runtime; devDeps needed for type-check)
COPY package.json tsconfig.json ./
RUN npm install

# Type-check then copy source (tsx runs .ts directly — no dist/ needed)
COPY src ./src
RUN npm run build

ENV ZALO_BRIDGE_PORT=3000
EXPOSE 3000 3001

# Healthcheck nội bộ container (compose cũng định nghĩa healthcheck riêng)
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["npm", "start"]
