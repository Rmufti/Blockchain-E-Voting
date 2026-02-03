# Database

Place database schemas, migrations, and seed data here.

Merge points:
- Backend connects to the DB. Use an env variable (e.g. `DATABASE_URL`) in the backend for the connection string; do not hardcode it.
- This folder is for schema definitions and migration scripts only; the backend owns the actual driver and queries. Keep table/column names and types documented here so backend and blockchain teams can align (e.g. user id, election id, ballot token storage).
- If the ledger is the source of truth for votes, document what is stored in the DB vs on-chain (e.g. users, sessions, audit logs) to avoid duplication and merge conflicts.

Suggested structure:
- `migrations/` – versioned schema changes (e.g. SQL or ORM migrations)
- `schema/` – current schema or ER diagram (optional)
- `seeds/` – dev/test seed data (optional)

After merging, add a short note in this README on how to run migrations and what the backend expects (e.g. DB name, required tables).
