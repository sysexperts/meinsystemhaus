# MeinSystemhaus

Business-Suite für kleine IT-Systemhäuser: Kundengewinnung (Leads/CRM), Projektmanagement und Kundenverwaltung. Läuft als Web-Anwendung und wird per Docker gehostet.

## Tech-Stack

- **Frontend:** React 19, TypeScript, Vite 7, TailwindCSS v4, react-router-dom, lucide-react
- **Backend:** Express (REST-API unter `/api`), TypeScript via `tsx`
- **Datenbank:** SQLite (`node:sqlite`), persistiert im Verzeichnis aus `DATA_DIR`
- **Hosting:** Docker / Docker Compose

## Voraussetzungen

- Node.js **>= 22.5** (wegen `node:sqlite`)
- Docker Desktop (für Container-Hosting)

## Entwicklung

```bash
npm install
npm run dev      # Vite-Frontend (:5173) + API-Server (:3001) parallel
```

Im Dev-Modus leitet Vite Anfragen an `/api` per Proxy an den Backend-Server auf Port 3001 weiter.

## Produktiv-Build (ohne Docker)

```bash
npm run build    # Frontend nach dist/
npm run start    # Server liefert dist/ + API unter http://localhost:3001
```

## Hosting mit Docker

```bash
docker compose up -d --build
```

- Erreichbar unter **http://localhost:3001**
- Die SQLite-Datenbank liegt im Volume `meinsystemhaus-data` (`/data` im Container) und bleibt über Neustarts erhalten.

Nützliche Befehle:

```bash
docker compose ps          # Status
docker compose logs -f     # Live-Logs
docker compose down        # Stoppen (Daten bleiben im Volume)
```

## Projektstruktur

```
server/        Express-Server (index.ts) + REST-Routen (routes.ts)
electron/db/   Datenschicht (SQLite-Schema + CRUD, wiederverwendet)
src/           React-Frontend
  lib/api.ts   Fetch-Client, wird als window.api bereitgestellt
  pages/       Seiten (Leads, Kunden, Projekte, Dashboard, ...)
  shared/      Gemeinsame Typen (Frontend + Backend)
Dockerfile, docker-compose.yml
```

## Konfiguration (Env)

| Variable    | Default        | Beschreibung                          |
|-------------|----------------|---------------------------------------|
| `PORT`      | `3001`         | Port des API-/Web-Servers             |
| `DATA_DIR`  | `./data`       | Verzeichnis der SQLite-Datenbank      |
| `NODE_ENV`  | –              | `production` liefert auch das Frontend |

> Beim ersten Start wird der erste angelegte Benutzer automatisch zum Admin.
