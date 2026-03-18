const { Pool } = require('pg');
require('dotenv').config();

// 1. Initialize the connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL Database'))
    .catch(err => console.error('❌ PostgreSQL Connection Error', err.stack));

/**
 * GATEKEEPER CHECK: Verifies the student exists and hasn't voted in this election yet.
 */
async function verifyVoterEligibility(studentNumber, electionId) {
    // 1. Check if user exists
    const userRes = await pool.query(
        'SELECT user_id, enrollment_status FROM users WHERE student_number = $1',
        [studentNumber]
    );

    if (userRes.rows.length === 0) {
        throw new Error('Student number not found in the system.');
    }

    const user = userRes.rows[0];

    if (user.enrollment_status !== 'active') {
        throw new Error('Student is not actively enrolled.');
    }

    // 2. Check if they already voted in this specific election
    const ballotRes = await pool.query(
        'SELECT ballot_id FROM ballots WHERE user_id = $1 AND election_id = $2',
        [user.user_id, electionId]
    );

    if (ballotRes.rows.length > 0) {
        throw new Error('This student has already cast a vote for this election.');
    }

    // If they pass all checks, return the internal user_id
    return user.user_id;
}

/**
 * RECEIPT GENERATOR: Saves the blockchain transaction ID to the DB.
 */
async function recordVoteReceipt(userId, electionId, rankingJson, blockchainTxId) {
    await pool.query(
        `INSERT INTO ballots (election_id, user_id, ranking_json, blockchain_tx_id) 
         VALUES ($1, $2, $3, $4)`,
        [electionId, userId, JSON.stringify(rankingJson), blockchainTxId]
    );
    return true;
}

// Export everything so server.js can use it
module.exports = {
    pool,
    verifyVoterEligibility,
    recordVoteReceipt
};