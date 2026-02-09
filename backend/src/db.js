// backend/src/db.js
// this module provides a shared postgres pool for repository tests

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  // this fails fast so tests do not accidentally run against an unknown database
  throw new Error("missing DATABASE_URL");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = { pool };
