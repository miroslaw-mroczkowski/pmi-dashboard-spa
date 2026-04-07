# PMI Dashboard

A production dashboard boilerplate built with Node.js, Express, SQLite and vanilla JS ES Modules.

## Stack

Node.js + Express + SQLite (better-sqlite3) + JWT + Vanilla JS ES Modules (SPA)

## Features

- Role-based access (admin / user)
- SPA router with dynamic navigation per role
- Tool groups per category (Production, Daily, Quality)
- Admin panel with user management, link CRUD, password resets
- Weather widget
- Dark/light theme

## Quick Start

```bash
npm install
node server/db/seed.js
npm run dev
```

Open `http://localhost:3000`

**Demo accounts:**

- Admin: `mrocz` / `test123`
- User: `testuser` / `user123`

## Deploy

See Railway or Render deployment — add environment variables:

- `JWT_SECRET` — random secret string
- `NODE_ENV` — `production`
- `ADMIN_PASSWORD` — admin password
- `USER_PASSWORD` — user password
