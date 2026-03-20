
//Main Hub
//This ties the database, server and the internet together

//const express = require('express');
const cors = require('cors');
const { submitVoteTransaction } = require('./services/fabricService');
const { verifyVoterEligibility, recordVoteReceipt } = require('./db.js'); // Adjust the path as needed

// 1. IMPORT standard tools: express and cors
// 2. IMPORT your blockchain function: { submitVoteTransaction } from './services/fabricService'
// 3. IMPORT your database logic (if you have it ready): e.g., from './db'
require('dotenv').config(); // Ensures your server can read the .env file
const express = require('express');
const { Pool } = require('pg'); // Imports the PostgreSQL client

// Set up the database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
//Initialize app
const app = express();
app.use(express.json());

//Middleware
app.use(cors());
app.use(express.json());


//Test Route
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// POST /api/vote
app.post('/api/vote', async (req, res) => {
  const { studentNumber, electionId, candidateId } = req.body;

  try {
    // ==========================================
    // STEP 1: The Gatekeeper (PostgreSQL Auth)
    // ==========================================
    // Check if the student exists AND is an active student
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE student_number = $1 AND enrollment_status = $2',
      [studentNumber, 'Active']
    );

    // If the database returns 0 rows, kick them out immediately
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ 
        error: "Unauthorized: Active student number not found in the system." 
      });
    }

    // ==========================================
    // STEP 2: The Vault (Hyperledger Fabric)
    // ==========================================
    // At this point, we know the student is legitimate. 
    // Now, we connect to the blockchain and let the smart contract handle the rest.
    
    // (Note: Replace this line with however you currently connect to your Fabric network)
    const contract = await getFabricContract(); 

    // Submit the transaction to contractVoting.js
    // We pass the studentNumber so the blockchain can record who voted (to prevent double voting)
    // Corrected to match: electionID, studentID, candidateName
    const result = await contract.submitTransaction('CastVote', electionId, studentNumber, candidateId);

    // If the smart contract doesn't throw an error, the vote was successful!
    res.status(200).json({
      message: "Success! Vote securely recorded on the blockchain.",
      transactionId: result.toString() // Fabric usually returns the transaction payload
    });

  } catch (error) {
    console.error("Voting Error:", error);
    
    // This will catch Fabric errors like "Election Closed" or "User Already Voted"
    res.status(500).json({ 
      error: "Failed to cast vote", 
      details: error.message 
    });
  }
});
//Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
