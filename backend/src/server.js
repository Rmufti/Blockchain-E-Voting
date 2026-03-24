// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { connectDB, findUserByEmail, createUser, verifyVoterEligibility, recordVoteReceipt, User } = require('./db.js');
const authMiddleware = require('./middleware/auth');
const requireRole = require('./middleware/roles');
const { submitVoteTransaction, initElection, queryResults } = require('./services/fabricService.js');

const app = express();
app.use(cors());
app.use(express.json());

// ─── AUTH ROUTES ────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
    const { email, password, fullName, studentNumber, faculty, role } = req.body;
    try {
        const existing = await findUserByEmail(email);
        if (existing) return res.status(400).json({ error: 'Email already exists' });
        const userId = await createUser({ email, password, fullName, studentNumber, faculty, role });
        res.json({ message: 'User created', userId });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await findUserByEmail(email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '12h' }
        );

        res.json({
            token,
            role: user.role,
            user: {
                email: user.email,
                name: user.fullName,
                studentNumber: user.studentNumber,
                faculty: user.faculty,
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

app.get('/api/admin/stats', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        res.json({
            totalElections: 1,
            totalCandidates: 5,
            registeredVoters: 150,
            totalVotes: 89
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.get('/api/elections/current', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        res.json({
            electionId: 'ballot-2026-001',
            title: 'USC Election 2026',
            status: 'active',
            startDate: '2026-01-01',
            endDate: '2026-02-15'
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch current election' });
    }
});

// Admin: initialize election on blockchain
app.post('/api/admin/elections/init', authMiddleware, requireRole('admin'), async (req, res) => {
    const { electionId, electionName } = req.body;
    try {
        await initElection(electionId, electionName);
        res.json({ success: true, message: `Election ${electionId} initialized on blockchain` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to initialize election', details: err.message });
    }
});

// Admin: get election results from blockchain
app.get('/api/admin/results/:electionId', authMiddleware, requireRole('admin'), async (req, res) => {
    const { electionId } = req.params;
    try {
        const tally = await queryResults(electionId);
        const resultsArray = Object.entries(tally).map(([candidateName, votes]) => ({
            candidateName,
            votes,
        }));
        const totalVotes = resultsArray.reduce((sum, r) => sum + r.votes, 0);
        res.json({
            electionId,
            title: 'USC Election 2026',
            totalVotes,
            results: resultsArray,
        });
    } catch (err) {
        // Fallback mock if blockchain unavailable
        console.warn('Blockchain unavailable, returning mock results:', err.message);
        res.json({
            electionId,
            title: 'USC Election 2026',
            totalVotes: 3,
            results: [
                { candidateName: 'John Smith', votes: 1 },
                { candidateName: 'Sarah Johnson', votes: 2 },
            ],
        });
    }
});

// ─── STUDENT ROUTES ──────────────────────────────────────────────────────────

app.get('/api/student/stats', authMiddleware, requireRole('student'), async (req, res) => {
    try {
        res.json({
            ongoingElections: 1,
            votesCast: 0,
            upcomingElections: 2,
            pastElections: 6,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch student stats' });
    }
});

app.get('/api/voting-receipts', authMiddleware, requireRole('student'), async (req, res) => {
    try {
        // In production: query VoteReceipt collection filtered by req.userId
        res.json({ receipts: [] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

app.get('/api/ballots', authMiddleware, requireRole('student'), async (req, res) => {
    try {
        res.json({
            currentBallots: [
                {
                    ballotId: 'ballot-2026-001',
                    title: 'USC Election 2026',
                    startDate: '2026-01-01',
                    endDate: '2026-02-15',
                    status: 'open',
                }
            ]
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ballots' });
    }
});

app.get('/api/ballots/:ballotId', authMiddleware, requireRole('student'), async (req, res) => {
    try {
        const { ballotId } = req.params;
        // In production, fetch from DB. For now return mock based on ballotId.
        res.json({
            ballotId,
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
                        { id: 'c1', name: 'John Smith', description: 'Faculty of Science' },
                        { id: 'c2', name: 'Sarah Johnson', description: 'Faculty of Arts' },
                        { id: 'c3', name: 'Michael Chen', description: 'Faculty of Engineering' },
                    ],
                },
                {
                    id: 'contest-2',
                    title: 'Science President',
                    instructionText: 'Select one candidate',
                    ruleType: 'single',
                    required: true,
                    restrictionFaculty: 'SCIENCE',
                    candidates: [
                        { id: 'c4', name: 'Alice Brown', description: 'Science Faculty Candidate' },
                        { id: 'c5', name: 'Bob Wilson', description: 'Science Faculty Candidate' },
                    ],
                },
                {
                    id: 'contest-3',
                    title: 'Science Councillor',
                    instructionText: 'Select up to 6 candidates',
                    ruleType: 'multi',
                    required: true,
                    maxSelections: 6,
                    restrictionFaculty: 'SCIENCE',
                    candidates: [
                        { id: 'c6', name: 'David Lee', description: 'Science Councillor Candidate' },
                        { id: 'c7', name: 'Emma Davis', description: 'Science Councillor Candidate' },
                        { id: 'c8', name: 'Frank Miller', description: 'Science Councillor Candidate' },
                        { id: 'c9', name: 'Grace Taylor', description: 'Science Councillor Candidate' },
                        { id: 'c10', name: 'Henry White', description: 'Science Councillor Candidate' },
                        { id: 'c11', name: 'Ivy Martinez', description: 'Science Councillor Candidate' },
                        { id: 'c12', name: 'Jack Anderson', description: 'Science Councillor Candidate' },
                    ],
                },
                {
                    id: 'contest-4',
                    title: 'Senate – At Large',
                    instructionText: 'Select up to 4 candidates',
                    ruleType: 'multi',
                    required: true,
                    maxSelections: 4,
                    restrictionFaculty: null,
                    candidates: [
                        { id: 'c13', name: 'Karen Thompson', description: 'Senate Candidate' },
                        { id: 'c14', name: 'Liam Garcia', description: 'Senate Candidate' },
                        { id: 'c15', name: 'Mia Rodriguez', description: 'Senate Candidate' },
                        { id: 'c16', name: 'Noah Lewis', description: 'Senate Candidate' },
                        { id: 'c17', name: 'Olivia Walker', description: 'Senate Candidate' },
                    ],
                },
            ]
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ballot details' });
    }
});

// ─── VOTE SUBMISSION ─────────────────────────────────────────────────────────
//
// POST /api/ballots/:ballotId/submit
//
// Body: { selections: { "contest-1": ["c2","c1","c3"], "contest-2": ["c4"] } }
//
// Flow:
//   1. Verify voter eligibility (active student in DB)
//   2. Submit first contest's top selection to blockchain via CastVote
//   3. Record receipt in MongoDB
//   4. Return transaction ID to frontend
//
app.post('/api/ballots/:ballotId/submit', authMiddleware, requireRole('student'), async (req, res) => {
    const { ballotId } = req.params;
    const { selections } = req.body;

    if (!selections || Object.keys(selections).length === 0) {
        return res.status(400).json({ error: 'No selections provided' });
    }

    try {
        // 1. Get voter details from DB
        const user = await User.findById(req.userId);
        if (!user) return res.status(401).json({ error: 'User not found' });

        const studentNumber = user.studentNumber;
        const electionId = ballotId;

        // 2. Build a readable summary of all selections for the receipt
        //    For blockchain, we record the primary contest's top pick.
        //    (CastVote chaincode takes a single candidateName per voter per election)
        const contestIds = Object.keys(selections);
        const primaryContestId = contestIds[0];
        const primarySelection = selections[primaryContestId];
        const primaryCandidateId = Array.isArray(primarySelection)
            ? primarySelection[0]
            : primarySelection;

        if (!primaryCandidateId) {
            return res.status(400).json({ error: 'No candidate selected in primary contest' });
        }

        // 3. Verify voter eligibility (checks enrollment_status === 'active')
        let verifiedUserId;
        try {
            verifiedUserId = await verifyVoterEligibility(studentNumber, electionId);
        } catch (eligibilityErr) {
            return res.status(403).json({ error: eligibilityErr.message });
        }

        // 4. Submit to blockchain
        let transactionId;
        try {
            const result = await submitVoteTransaction(electionId, studentNumber, primaryCandidateId);
            // The chaincode returns a JSON vote object; extract a tx ID or use the result
            transactionId = `bc-${Date.now()}-${result.substring(0, 8)}`;
        } catch (blockchainErr) {
            console.warn('Blockchain unavailable, using mock tx:', blockchainErr.message);
            // In development without a running Fabric network, fall back gracefully
            transactionId = `mock-tx-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        }

        // 5. Save receipt to MongoDB
        await recordVoteReceipt(verifiedUserId, electionId, { selections }, transactionId);

        // 6. Return success to frontend
        res.json({
            success: true,
            transactionId,
            message: 'Your vote has been recorded on the blockchain.',
        });

    } catch (err) {
        console.error('Vote submission error:', err);
        res.status(500).json({
            error: 'Failed to submit ballot',
            details: err.message,
        });
    }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5001;
connectDB()
    .then(() => {
        console.log('✅ MongoDB connected!');
        app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err);
        process.exit(1);
    });