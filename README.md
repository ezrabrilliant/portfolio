# ezrabrilliant.com

Ezra Brilliant's portfolio: a playable voxel archipelago. Each island holds one project with its real program UI
(GTID, Petak Umpet, Orbit Store, Ezra Bot and more). Walk around in Play mode or let the Tour carry you from island to
island.

Live at [ezrabrilliant.com](https://ezrabrilliant.com).

## Stack

React + TypeScript, React Three Fiber / three.js, zustand, Vite, Vitest. The site runs as a Cloudflare Worker
(`wrangler.jsonc`): `dist/` as static assets, and `worker/index.js` answering `/api/gtid/*` (a cached proxy to
gtid.pro).

## Develop

```sh
npm install
npm run dev          # the site, on Vite
npm run start:dev    # the local /api server (server.js) the dev site proxies to
npm test             # Vitest
npm run lint
```

`.env.example` lists the EmailJS keys the contact form in Ezra Bot's chat needs (copy it to `.env.local`).

## Deploy

```sh
npm run deploy       # build + wrangler deploy: beta.ezrabrilliant.com, ezrabrilliant.com and www
```

## Layout

- `src/world/engine` – voxel grid, physics, camera math, audio, particles
- `src/world/scene` – the 3D world: islands, Ezra, critters, cameras, tour
- `src/world/ui` – HUD, phone controls, map, Ezra Bot chat
- `src/config/portfolio.ts` – projects, milestones and copy
- `worker/`, `server/` – the `/api` proxy for the Worker and for local dev
