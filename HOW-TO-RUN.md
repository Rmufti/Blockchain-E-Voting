# How to Run This Project

Quick reference for anyone cloning the repo.

## Frontend (working now)

1. Prerequisites: Node.js and npm installed.
2. Go to the frontend folder:  
   `cd frontend`
3. Create a `.env` file in `frontend/` with:
   ```env
   VITE_USE_MOCKS=true
   VITE_API_BASE_URL=http://localhost:8000
   ```
   With `VITE_USE_MOCKS=true` the app runs without a backend (mock data).
4. Install and start:
   ```bash
   npm install
   npm run dev
   ```
5. Open: http://localhost:5173 (or the port shown in the terminal).  
   Login: any email/password for student; `admin@uwo.ca` / `admin` for admin.

More detail: see `frontend/SETUP.md`.

## Backend

Code goes in the `backend/` folder. When your API is ready, set `VITE_USE_MOCKS=false` in `frontend/.env` and `VITE_API_BASE_URL` to your backend URL (e.g. `http://localhost:8000`). See `backend/README.md` for how it connects to the frontend and other parts.

## Blockchain

Chaincode and gateway code go in `blockchain/`. The backend calls this layer; the frontend does not. See `blockchain/README.md` for merge and integration notes.

## Database

Schemas and migrations go in `database/`. The backend uses the DB; set something like `DATABASE_URL` in the backend env. See `database/README.md` for structure and expectations.
