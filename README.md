# PMI Dashboard

Dashboard produkcyjny dla Philip Morris International.

## Stack

Node.js + Express + SQLite (better-sqlite3) + JWT + Vanilla JS ES Modules

## Lokalne uruchomienie

```bash
npm install
npm run seed      # Inicjalizacja bazy danych
npm run dev       # Tryb deweloperski
```

Aplikacja dostępna na `http://localhost:3000`

**Konta testowe:**

- Admin: `mrocz` / `test123`
- User: `testuser` / `user123`

## Deploy na Render.com

1. Wejdź na [render.com](https://render.com) i zaloguj się przez GitHub
2. Kliknij **New → Web Service**
3. Wybierz repo `pmi-dashboard-spa`
4. Ustawienia:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node version:** 18+
5. Dodaj zmienne środowiskowe (**Environment**):
   - `JWT_SECRET` → wygeneruj losowy ciąg (np. z [randomkeygen.com](https://randomkeygen.com))
   - `ADMIN_PASSWORD` → hasło admina
   - `USER_PASSWORD` → hasło mistrzów
   - `NODE_ENV` → `production`
6. Kliknij **Create Web Service**

> ⚠️ Render darmowy tier usypia aplikację po 15min nieaktywności. Pierwsze wejście może trwać ~30s.

## Deploy na Railway.app

1. Wejdź na [railway.app](https://railway.app) i zaloguj się przez GitHub
2. Kliknij **New Project → Deploy from GitHub repo**
3. Wybierz repo `pmi-dashboard-spa`
4. Railway automatycznie wykryje Node.js
5. Przejdź do **Variables** i dodaj:
   - `JWT_SECRET` → losowy ciąg
   - `ADMIN_PASSWORD` → hasło admina
   - `USER_PASSWORD` → hasło mistrzów
   - `NODE_ENV` → `production`
6. W **Settings → Networking** wygeneruj domenę

> ✅ Railway nie usypia aplikacji na darmowym planie (500h/miesiąc).

## Zmienne środowiskowe

| Zmienna          | Opis                          | Przykład                        |
| ---------------- | ----------------------------- | ------------------------------- |
| `JWT_SECRET`     | Klucz do podpisywania tokenów | `losowy-ciag-znakow`            |
| `ADMIN_PASSWORD` | Hasło kont z rolą admin       | `admin2026`                     |
| `USER_PASSWORD`  | Hasło kont z rolą user        | `mistrz2026`                    |
| `NODE_ENV`       | Środowisko                    | `production`                    |
| `PORT`           | Port serwera                  | `3000` (auto na Render/Railway) |
