# OpenClaw — foundation stub (Story 1.1)
# Image OpenClaw thật chưa công khai; stub này chỉ để stack bootstrap +
# verify persist/restart. Thay bằng runtime OpenClaw thật ở Epic 2+.
FROM node:20-alpine

WORKDIR /app

# Stub server (config mount runtime qua volume openclaw/config -> /app/config)
# package.json bắt buộc "type":"module" để ESM `import` chạy ổn định trên mọi
# Node 20.x (không phụ thuộc auto-detect ESM của bản patch mới).
COPY package.json server.js ./

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:8000/healthz || exit 1

CMD ["node", "server.js"]
