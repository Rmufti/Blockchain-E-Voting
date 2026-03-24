// // Main Hub
// // This ties the database, server and the internet together

// require('dotenv').config(); // load env variables
// const authRoutes = require('./routes/auth');
// const authMiddleware = require('./middleware/auth');
// const requireRole = require('./middleware/roles');
// const app = express();
// app.use('/api/auth', authRoutes);

// // Example protected routes
// app.get('/api/admin-only', authMiddleware, requireRole('admin'), (req, res) => {
//   res.json({ message: 'You are an admin!' });
// });

// app.get('/api/student-only', authMiddleware, requireRole('student'), (req, res) => {
//   res.json({ message: 'You are a student!' });
// });



// const express = require('express');
// const cors = require('cors');

// // Hyperledger / blockchain stuff — leave as is
// const { submitVoteTransaction } = require('./services/fabricService.js');

// // Your DB functions
// const { verifyVoterEligibility, recordVoteReceipt } = require('./db.js'); // DB connection

// const { Pool } = require('pg'); // PostgreSQL client

// // Auth routes
// const authRoutes = require('./routes/auth');

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// pool.connect()
//     .then(client => {
//         console.log("✅ MONGO connected!");
//         client.release();
//     })
//     .catch(err => console.error("❌ MONGO Connection Error", err));



// // Middleware
// app.use(cors());
// app.use(express.json());

// // Test route
// app.get('/', (req, res) => {
//   res.send('Server is running!');
// });

// // Use auth routes
// app.use('/api/auth', authRoutes);

// // POST /api/vote
// // This now only handles your part (DB verification & auth), blockchain part is untouched
// app.post('/api/vote', async (req, res) => {
//   const { studentNumber, electionId, candidateId } = req.body;

//   try {
//   =========================================
//     const userQuery = await pool.query(
//       'SELECT * FROM users WHERE student_number = $1 AND enrollment_status = $2',
//       [studentNumber, 'Active']
//     );

//     if (userQuery.rows.length === 0) {
//       return res.status(401).json({ 
//         error: 'Unauthorized: Active student number not found in the system.' 
//       });
//     }




//LEDGERRRR
//     const contract = await getFabricContract();
//     const result = await contract.submitTransaction('CastVote', electionId, studentNumber, candidateId);

//     res.status(200).json({
//       message: 'Success! Vote securely recorded on the blockchain.',
//       transactionId: result.toString(),
//     });

//   } catch (error) {
//     console.error('Voting Error:', error);
//     res.status(500).json({ 
//       error: 'Failed to cast vote', 
//       details: error.message 
//     });
//   }
// });

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });


// require('dotenv').config(); // load env variables
// const express = require('express');
// const cors = require('cors');
// const jwt = require('jsonwebtoken');
// const app = express();

// // Hyperledger / blockchain stuff — leave as is
// const { submitVoteTransaction } = require('./services/fabricService.js');

// // DB functions (your part — vote verification)
// const { verifyVoterEligibility, recordVoteReceipt } = require('./db.js'); 

// // Auth routes
// const authRoutes = require('./routes/auth');

// // Middleware
// const authMiddleware = require('./middleware/auth');
// const requireRole = require('./middleware/roles');

//  // ⚡ must declare before using routes

// app.use(cors());
// app.use(express.json());

// // Test route
// app.get('/', (req, res) => {
//   res.send('Server is running!');
// });

// app.use('/api/auth', authRoutes);


// app.get('/api/admin-only', authMiddleware, requireRole('admin'), (req, res) => {
//   res.json({ message: 'You are an admin!' });
// });

// app.get('/api/student-only', authMiddleware, requireRole('student'), (req, res) => {
//   res.json({ message: 'You are a student!' });
// });

// // =====================
// // VOTE ROUTE
// // =====================
// app.post('/api/vote', async (req, res) => {
//   const { studentNumber, electionId, candidateId } = req.body;

//   try {
//     // STEP 1: DB Gatekeeper (your part)
//     const userId = await verifyVoterEligibility(studentNumber, electionId);

//     // STEP 2: Blockchain / ledger — do not touch
//     const contract = await getFabricContract();
//     const result = await contract.submitTransaction('CastVote', electionId, studentNumber, candidateId);

//     // Save receipt
//     await recordVoteReceipt(userId, electionId, { candidateId }, result.toString());

//     res.status(200).json({
//       message: 'Success! Vote securely recorded on the blockchain.',
//       transactionId: result.toString(),
//     });

//   } catch (error) {
//     console.error('Voting Error:', error);
//     res.status(500).json({ 
//       error: 'Failed to cast vote', 
//       details: error.message 
//     });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });













// server.js
// // Main Hub
// // This ties the database, server and the internet together

require('dotenv').config(); // load env variables
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { connectDB, createUser, findUserByEmail, verifyVoterEligibility, recordVoteReceipt, User } = require('./db.js');
const authMiddleware = require('./middleware/auth'); // expects req.user from JWT
const requireRole = require('./middleware/roles'); // checks user.role
// const authRoutes = require('./routes/auth'); // optional, can keep inline routes

// Hyperledger / blockchain stuff
const { getFabricContract } = require('./services/fabricService.js');

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// AUTH ROUTES
// =========================

// Register a new user
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName, studentNumber, faculty, role } = req.body;

  try {
    const existing = await findUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const userId = await createUser({ email, password, fullName, studentNumber, faculty, role });
    res.json({ message: 'User created', userId });

  } catch (err) {
    console.error('Register ERROR:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', email);

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '12h' }
    );

    console.log('Login successful for:', email);
    res.json({
      token,
      role: user.role,
      user: { email: user.email, fullName: user.fullName, studentNumber: user.studentNumber }
    });

  } catch (err) {
    console.error('Login route ERROR:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// =========================
// PROTECTED EXAMPLE ROUTES
// =========================
app.get('/api/admin-only', authMiddleware, requireRole('admin'), (req, res) => {
  res.json({ message: 'You are an admin!' });
});

app.get('/api/student-only', authMiddleware, requireRole('student'), (req, res) => {
  res.json({ message: 'You are a student!' });
});

// =========================
// ADMIN ENDPOINTS
// =========================
app.get('/api/admin/stats', authMiddleware, requireRole('admin'), async (req, res) => {
  console.log('Admin stats request received');
  console.log('Headers:', req.headers);
  console.log('User:', req.userId, 'Role:', req.role);
  try {
    // Mock stats for now - replace with real DB queries later
    const stats = {
      totalElections: 1,
      totalCandidates: 5,
      registeredVoters: 150,
      totalVotes: 89
    };
    console.log('Sending stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

app.get('/api/elections/current', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // Mock current election - replace with real DB query later
    const currentElection = {
      electionId: 'election-2026-001',
      title: 'USC Election 2026',
      status: 'active',
      startDate: '2026-01-01',
      endDate: '2026-02-15'
    };
    res.json(currentElection);
  } catch (error) {
    console.error('Current election error:', error);
    res.status(500).json({ error: 'Failed to fetch current election' });
  }
});

// =========================
// STUDENT ENDPOINTS
// =========================
app.get('/api/ballots', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    // Mock ballots for now - replace with real DB queries later
    const ballots = {
      currentBallots: [
        {
          ballotId: 'ballot-2026-001',
          title: 'USC Election 2026',
          startDate: '2026-01-01',
          endDate: '2026-02-15',
          status: 'open',
        }
      ]
    };
    res.json(ballots);
  } catch (error) {
    console.error('Ballots error:', error);
    res.status(500).json({ error: 'Failed to fetch ballots' });
  }
});

app.get('/api/voting-receipts', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    // Mock receipts for now - replace with real DB queries later
    const receipts = {
      receipts: [
        {
          ballotId: 'ballot-2025-001',
          ballotTitle: 'USC Election 2025',
          transactionId: 'tx-1704067200000',
          timestamp: '2025-01-01T12:00:00Z',
        }
      ]
    };
    res.json(receipts);
  } catch (error) {
    console.error('Voting receipts error:', error);
    res.status(500).json({ error: 'Failed to fetch voting receipts' });
  }
});

app.get('/api/student/stats', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    // Mock student stats for now - replace with real DB queries later
    const stats = {
      ongoingElections: 1,
      completedVotes: 0,
      totalAvailableBallots: 1
    };
    res.json(stats);
  } catch (error) {
    console.error('Student stats error:', error);
    res.status(500).json({ error: 'Failed to fetch student statistics' });
  }
});

// =========================
// VOTING ENDPOINTS
// =========================
app.post('/api/votes', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { ballotId, selections } = req.body;
    const userId = req.userId;

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const studentNumber = user.studentNumber;
    const electionId = ballotId; // Assume ballotId maps to electionId

    // Assume single contest for simplicity, get candidateId
    const candidateId = selections['contest-1']; // Adjust based on actual structure

    // Verify voter eligibility
    const verifiedUserId = await verifyVoterEligibility(studentNumber, electionId);

    // Submit to blockchain
    let transactionId;
    try {
      const contract = await getFabricContract();
      const result = await contract.submitTransaction('CastVote', electionId, studentNumber, candidateId);
      transactionId = result.toString();
    } catch (blockchainError) {
      console.warn('Blockchain not available, using mock transaction:', blockchainError.message);
      // Fallback to mock transaction for development
      transactionId = `mock-tx-${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Record vote receipt
    await recordVoteReceipt(verifiedUserId, electionId, { selections }, transactionId);

    res.json({
      success: true,
      transactionId: transactionId,
      message: 'Vote submitted successfully'
    });
  } catch (error) {
    console.error('Voting error:', error);
    res.status(500).json({ error: 'Failed to submit vote', details: error.message });
  }
});

app.get('/api/ballots/:ballotId', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { ballotId } = req.params;

    // Mock ballot details - replace with real DB query later
    const ballot = {
      ballotId: ballotId,
      title: 'USC Election 2026',
      contests: [
        {
          id: 'contest-1',
          title: 'USC President',
          instructionText: 'Rank candidates in order of preference (1 = most preferred)',
          ruleType: 'ranked',
          required: true,
          restrictionFaculty: null,
          candidates: [
            { id: 'c1', name: 'John Smith', description: 'Candidate for President' },
            { id: 'c2', name: 'Sarah Johnson', description: 'Candidate for President' },
            { id: 'c3', name: 'Michael Chen', description: 'Candidate for President' },
          ],
        }
      ]
    };

    res.json(ballot);
  } catch (error) {
    console.error('Ballot details error:', error);
    res.status(500).json({ error: 'Failed to fetch ballot details' });
  }
});

// Submit ballot endpoint (used by frontend)
app.post('/api/ballots/:ballotId/submit', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { ballotId } = req.params;
    const { selections } = req.body;
    const userId = req.userId;

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const studentNumber = user.studentNumber;
    const electionId = ballotId; // Assume ballotId maps to electionId

    // Handle selections - for now, take the first contest and first candidate
    const contestIds = Object.keys(selections);
    if (contestIds.length === 0) {
      return res.status(400).json({ error: 'No selections provided' });
    }
    
    const firstContest = contestIds[0];
    const candidateSelections = selections[firstContest];
    
    let candidateId;
    if (Array.isArray(candidateSelections)) {
      // For ranked/multi, take the first choice
      candidateId = candidateSelections[0];
    } else {
      candidateId = candidateSelections;
    }

    if (!candidateId) {
      return res.status(400).json({ error: 'No candidate selected' });
    }

    // Verify voter eligibility
    const verifiedUserId = await verifyVoterEligibility(studentNumber, electionId);

    // Submit to blockchain
    let transactionId;
    try {
      const contract = await getFabricContract();
      const result = await contract.submitTransaction('CastVote', electionId, studentNumber, candidateId);
      transactionId = result.toString();
    } catch (blockchainError) {
      console.warn('Blockchain not available, using mock transaction:', blockchainError.message);
      // Fallback to mock transaction for development
      transactionId = `mock-tx-${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Record vote receipt
    await recordVoteReceipt(verifiedUserId, electionId, { selections }, transactionId);

    res.json({
      success: true,
      transactionId: transactionId,
      message: 'Vote submitted successfully'
    });
  } catch (error) {
    console.error('Ballot submit error:', error);
    res.status(500).json({ error: 'Failed to submit ballot', details: error.message });
  }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    console.log('✅ MongoDB connected!');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ Failed to connect DB', err));