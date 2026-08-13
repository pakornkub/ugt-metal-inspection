FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

RUN mkdir -p uploads

EXPOSE 3101
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3101/health || exit 1

CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && node dist/index.js"]
