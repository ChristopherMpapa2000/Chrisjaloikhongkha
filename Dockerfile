# Production Docker Image for แสงคงคา (Saeng Khongkha)
# Zero npm dependencies — ultra-fast build & tiny footprint using Node.js 24 LTS Alpine
FROM node:24-alpine

WORKDIR /app

# Create non-root user and local data directory (for optional SQLite fallback)
RUN mkdir -p /app/data && chown -R node:node /app

COPY --chown=node:node package.json server.js db.js db-supabase.js ./
COPY --chown=node:node public ./public

USER node

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
