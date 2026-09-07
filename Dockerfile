# syntax=docker/dockerfile:1

# ---------- Tahap 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Vite mem-bake VITE_* ke dalam bundle saat BUILD, bukan membacanya saat runtime.
# Jadi nilainya harus tersedia di sini; menaruhnya di `environment:` compose
# tidak akan berpengaruh dan form kontak akan diam-diam mati di produksi.
ARG VITE_EMAILJS_SERVICE_ID
ARG VITE_EMAILJS_TEMPLATE_ID
ARG VITE_EMAILJS_PUBLIC_KEY

# Naikkan ke ENV supaya Vite pasti melihatnya saat `npm run build`.
ENV VITE_EMAILJS_SERVICE_ID=$VITE_EMAILJS_SERVICE_ID
ENV VITE_EMAILJS_TEMPLATE_ID=$VITE_EMAILJS_TEMPLATE_ID
ENV VITE_EMAILJS_PUBLIC_KEY=$VITE_EMAILJS_PUBLIC_KEY

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Tahap 2: runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Hanya dependency produksi (express + cors)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY server.js ./

RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
