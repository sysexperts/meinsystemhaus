# syntax=docker/dockerfile:1

############################
# Stage 1: Frontend bauen
############################
FROM node:22-alpine AS build
WORKDIR /app

# Abhaengigkeiten installieren (Layer-Caching ueber package-Dateien)
COPY package*.json ./
RUN npm install

# Quellcode kopieren und Frontend bauen -> /app/dist
COPY . .
RUN npm run build

############################
# Stage 2: Laufzeit
############################
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

# Nur Produktiv-Abhaengigkeiten installieren
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Gebautes Frontend und Server-/Datenschicht-Quellen uebernehmen
COPY --from=build /app/dist ./dist
COPY server ./server
COPY electron/db ./electron/db
COPY src/shared ./src/shared
COPY tsconfig.json ./tsconfig.json

# Persistentes Datenverzeichnis fuer die SQLite-Datenbank
RUN mkdir -p /data
VOLUME ["/data"]

# NODE_ENV ist oben bereits auf production gesetzt -> tsx direkt starten
# (kein cross-env noetig, das nur fuer lokale Windows-Entwicklung gebraucht wird).
EXPOSE 3001
CMD ["npx", "tsx", "server/index.ts"]
