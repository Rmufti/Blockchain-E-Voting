// backend/src/repos.js
// these functions are minimal database operations used to validate database requirements

const { pool } = require("./db");

async function createUser({ studentNumber, email, fullName, faculty, yearOfStudy }) {
  const { rows } = await pool.query(
    `insert into users (student_number, email, full_name, faculty, year_of_study, enrollment_status)
     values ($1, $2, $3, $4, $5, 'active')
     returning user_id`,
    [studentNumber, email, fullName, faculty || null, yearOfStudy || null]
  );
  return rows[0].user_id;
}

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `select user_id, student_number, email, full_name
     from users
     where email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function assignRole(userId, roleKey) {
  const { rows: roleRows } = await pool.query(
    `select role_id from roles where role_key = $1`,
    [roleKey]
  );
  if (!roleRows[0]) throw new Error(`role not found: ${roleKey}`);

  await pool.query(
    `insert into user_roles (user_id, role_id)
     values ($1, $2)
     on conflict do nothing`,
    [userId, roleRows[0].role_id]
  );
}

async function listRoles(userId) {
  const { rows } = await pool.query(
    `select r.role_key
     from user_roles ur
     join roles r on r.role_id = ur.role_id
     where ur.user_id = $1
     order by r.role_key`,
    [userId]
  );
  return rows.map((r) => r.role_key);
}

async function getCurrentElection() {
  const { rows } = await pool.query(
    `select election_id, title
     from elections
     where status = 'open'
       and (starts_at is null or starts_at <= now())
       and (ends_at is null or ends_at >= now())
     order by starts_at desc nulls last, created_at desc
     limit 1`
  );
  return rows[0] || null;
}

async function createBallot({ userId, electionId, rankingJson, blockchainTxId }) {
  const { rows } = await pool.query(
    `insert into ballots (user_id, election_id, ranking_json, blockchain_tx_id)
     values ($1, $2, $3::jsonb, $4)
     returning ballot_id`,
    [userId, electionId, JSON.stringify(rankingJson), blockchainTxId]
  );
  return rows[0].ballot_id;
}

async function getBallot({ userId, electionId }) {
  const { rows } = await pool.query(
    `select ballot_id, ranking_json, blockchain_tx_id
     from ballots
     where user_id = $1 and election_id = $2`,
    [userId, electionId]
  );
  return rows[0] || null;
}

module.exports = {
  createUser,
  getUserByEmail,
  assignRole,
  listRoles,
  getCurrentElection,
  createBallot,
  getBallot,
};
