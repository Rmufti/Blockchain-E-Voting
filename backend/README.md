# Backend

Place the API server and application logic here.

Merge points:
- The frontend calls `VITE_API_BASE_URL` (default `http://localhost:8000`). Your server should listen on that host/port or set the same in frontend `.env`.
- Auth: frontend sends `Authorization: Bearer <token>` and expects JWT-style login at `POST /api/auth/login` with `{ email, password, userType }`.
- Implement the endpoints used by `frontend/src/services/api.js` (login, ballots, votes, admin stats/results, voting receipts) or keep mock mode on in the frontend until ready.

Suggested structure:
- `server/` or `app/` – main application and routes
- `routes/` – API route handlers
- Config (e.g. port, DB URL, blockchain gateway) via environment variables

Keep API request/response shapes consistent with the frontend so the existing `api.js` client works with minimal changes.
