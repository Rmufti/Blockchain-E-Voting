// backend/src/routes/elections.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const Election = require('../models/Election');
const { initElection, getElection } = require('../services/fabricService');
const { submitVoteTransaction } = require('../services/fabricService');

const KNOWN_FACULTIES = [
    'SCIENCE',
    'ARTS',
    'ENGINEERING',
    'BUSINESS',
    'LAW',
    'MEDICINE',
    'EDUCATION',
    'SOCIAL_SCIENCE',
];

// ── GET /api/elections ───────────────────────────────────────────────────────
// Admin: all elections. Student: only elections they're eligible for.
router.get('/', authMiddleware, async (req, res) => {
    try {
        let query = {};

        if (req.role === 'student') {
            const userFaculty = req.faculty; // set by auth middleware below
            // Student sees: presidential ballots (no restriction) OR their faculty's ballots
            query = {
                $or: [
                    { restrictedToFaculty: null },
                    { restrictedToFaculty: userFaculty },
                ],
            };
        }

        const elections = await Election.find(query).sort({ createdAt: -1 });
        res.json({ elections });
    } catch (err) {
        console.error('GET /elections error:', err);
        res.status(500).json({ error: 'Failed to fetch elections' });
    }
});

// ── GET /api/elections/:ballotId ─────────────────────────────────────────────
router.get('/:ballotId', authMiddleware, async (req, res) => {
    try {
        const election = await Election.findOne({ ballotId: req.params.ballotId });
        if (!election) return res.status(404).json({ error: 'Election not found' });

        // Students: verify they're allowed to view this ballot
        if (req.role === 'student') {
            const userFaculty = req.faculty;
            if (
                election.restrictedToFaculty &&
                election.restrictedToFaculty !== userFaculty
            ) {
                return res.status(403).json({ error: 'You are not eligible for this ballot' });
            }
        }

        // --- NEW BLOCKCHAIN FETCH LOGIC ---
        let blockchainData = null;
        try {
            // Ask the smart contract for the official ledger state
            blockchainData = await getElection(req.params.ballotId);
        } catch (bcErr) {
            console.warn(`Could not fetch blockchain data for ${req.params.ballotId}:`, bcErr.message);
            // We don't fail the whole request here, just in case the network is temporarily down
        }

        // Combine MongoDB data with Blockchain data
        const responseData = {
            ...election.toObject(), // Convert Mongoose document to standard JSON
            blockchainState: blockchainData 
        };

        res.json(responseData);
        // ----------------------------------

    } catch (err) {
        console.error('GET /elections/:ballotId error:', err);
        res.status(500).json({ error: 'Failed to fetch election' });
    }
});

// ── POST /api/elections ──────────────────────────────────────────────────────
// Admin only: create a new election + initialize on blockchain
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
    const {
        title,
        electionType,   // 'presidential' | 'faculty'
        startDate,
        endDate,
        restrictedToFaculty, // null for presidential, faculty string for faculty elections
        contests,            // array of contest objects from the frontend form
    } = req.body;

    if (!title || !electionType || !startDate || !endDate) {
        return res.status(400).json({ error: 'title, electionType, startDate, and endDate are required' });
    }

    if (!contests || contests.length === 0) {
        return res.status(400).json({ error: 'At least one contest is required' });
    }

    // Presidential elections are open to everyone — ignore any restriction
    const finalRestriction = electionType === 'presidential' ? null : (restrictedToFaculty || null);

    // Validate faculty value if provided
    if (finalRestriction && !KNOWN_FACULTIES.includes(finalRestriction)) {
        return res.status(400).json({
            error: `Unknown faculty "${finalRestriction}". Valid values: ${KNOWN_FACULTIES.join(', ')}`,
        });
    }

    // Build ballot ID
    const ballotId = `ballot-${Date.now()}-${uuidv4().substring(0, 6)}`;

    // Normalise contests — assign IDs to candidates if missing
    const normalisedContests = contests.map((contest, ci) => ({
        id: contest.id || `contest-${ci + 1}`,
        title: contest.title,
        instructionText: contest.instructionText || '',
        ruleType: contest.ruleType || 'single',
        required: contest.required !== false,
        maxSelections: contest.maxSelections || null,
        // Contest-level faculty restriction can be set independently of the ballot restriction
        restrictionFaculty: contest.restrictionFaculty || finalRestriction || null,
        candidates: (contest.candidates || []).map((c, idx) => ({
            id: c.id || `c${ci}-${idx}`,
            name: c.name,
            description: c.description || '',
        })),
    }));

    try {
        // 1. Save to MongoDB
        const election = await Election.create({
            ballotId,
            title,
            electionType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: new Date(startDate) <= new Date() ? 'open' : 'upcoming',
            restrictedToFaculty: finalRestriction,
            contests: normalisedContests,
            createdBy: req.userId,
        });

        // 2. Initialize on blockchain (non-blocking — if it fails we still have the DB record)
        try {
            await initElection(ballotId, title);
            election.blockchainInitialized = true;
            await election.save();
            console.log(`Blockchain election initialized: ${ballotId}`);
        } catch (bcErr) {
            console.warn(`Blockchain init failed for ${ballotId} (will retry later):`, bcErr.message);
            // Don't fail the request — admin can retry via the reinit endpoint
        }

        res.status(201).json({
            success: true,
            election,
            message: election.blockchainInitialized
                ? 'Election created and initialized on blockchain.'
                : 'Election created in DB. Blockchain initialization pending (network may be down).',
        });
    } catch (err) {
        console.error('POST /elections error:', err);
        res.status(500).json({ error: 'Failed to create election', details: err.message });
    }
});

// ── PUT /api/elections/:ballotId ─────────────────────────────────────────────
// Admin only: edit an existing election (metadata only — not contests, for simplicity)
router.put('/:ballotId', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { title, startDate, endDate, status, restrictedToFaculty } = req.body;
        const update = {};
        if (title) update.title = title;
        if (startDate) update.startDate = new Date(startDate);
        if (endDate) update.endDate = new Date(endDate);
        if (status) update.status = status;
        if (restrictedToFaculty !== undefined) update.restrictedToFaculty = restrictedToFaculty;

        const election = await Election.findOneAndUpdate(
            { ballotId: req.params.ballotId },
            { $set: update },
            { new: true }
        );

        if (!election) return res.status(404).json({ error: 'Election not found' });
        res.json({ success: true, election });
    } catch (err) {
        console.error('PUT /elections/:ballotId error:', err);
        res.status(500).json({ error: 'Failed to update election' });
    }
});

// ── DELETE /api/elections/:ballotId ──────────────────────────────────────────
router.delete('/:ballotId', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const election = await Election.findOneAndDelete({ ballotId: req.params.ballotId });
        if (!election) return res.status(404).json({ error: 'Election not found' });
        res.json({ success: true, message: 'Election deleted' });
    } catch (err) {
        console.error('DELETE /elections/:ballotId error:', err);
        res.status(500).json({ error: 'Failed to delete election' });
    }
});

// ── POST /api/elections/:ballotId/blockchain-init ────────────────────────────
// Admin: retry blockchain initialization if it failed at creation time
router.post('/:ballotId/blockchain-init', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const election = await Election.findOne({ ballotId: req.params.ballotId });
        if (!election) return res.status(404).json({ error: 'Election not found' });

        await initElection(election.ballotId, election.title);
        election.blockchainInitialized = true;
        await election.save();

        res.json({ success: true, message: `Election ${election.ballotId} initialized on blockchain` });
    } catch (err) {
        console.error('blockchain-init error:', err);
        res.status(500).json({ error: 'Blockchain initialization failed', details: err.message });
    }
});

// Add this route near the bottom of backend/src/routes/elections.js
// ── POST /api/elections/:ballotId/submit ────────────────────────────────────
router.post('/:ballotId/submit', authMiddleware, async (req, res) => {
    try {
        const { ballotId } = req.params;
        const { selections } = req.body;
        
        // Use the student's ID from the auth token
        const voterId = req.userId; 

        // Extract the selected candidate ID
        // Note: If you have multiple contests, you might need to loop through this, 
        // but this works for a single contest selection!
        const contestId = Object.keys(selections)[0];
        const candidateId = selections[contestId][0]; 

        // Send to the Hyperledger Fabric Smart Contract
        const txResult = await submitVoteTransaction(ballotId, voterId, candidateId);

        res.json({ 
            success: true, 
            transactionId: txResult, 
            message: 'Vote successfully secured on the blockchain.' 
        });

    } catch (err) {
        console.error('Failed to submit vote to blockchain:', err);
        if (err.message && err.message.includes('already voted')) {
            return res.status(400).json({ error: 'You have already voted in this election.' });
        }
        res.status(500).json({ error: 'Failed to process vote on the blockchain.' });
    }
});

module.exports = router;
module.exports.KNOWN_FACULTIES = KNOWN_FACULTIES;
