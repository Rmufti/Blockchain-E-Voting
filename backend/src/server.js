// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const { connectDB, findUserByEmail, createUser, verifyVoterEligibility, recordVoteReceipt, VoteReceipt, User } = require('./db.js');
const Election = require('./models/Election');
const authMiddleware = require('./middleware/auth');
const requireRole = require('./middleware/roles');
const { submitVoteTransaction, initElection, queryResults } = require('./services/fabricService.js');
const electionsModule = require('./routes/elections');
const { __testables: electionPolicies, reconcileCandidateRoles } = electionsModule;
const FABRIC_ENABLED = (process.env.FABRIC_ENABLED || 'true').toLowerCase() !== 'false';

const ADMIN_SUPER_ROLES = new Set(['admin', 'usc_admin']);
const DELEGABLE_ROLES = new Set([
    'usc_president',
    'usc_vp',
    'faculty_president',
    'councillor',
    'meeting_chair',
    'student',
]);
const ADMIN_RELATED_ROLES = new Set(['admin', 'usc_admin', 'usc_president', 'usc_vp', 'faculty_president']);
const ROLE_RANK = {
    usc_president: 1,
    usc_vp: 2,
    faculty_president: 3,
    councillor: 4,
    meeting_chair: 4,
    candidate: 5,
    student: 6,
};
const STUDENT_EXEMPT_ROLES = new Set(['usc_president', 'usc_vp']);

function normalizeRole(role) {
    return role ? String(role).trim().toLowerCase() : '';
}

function normalizeFaculty(value) {
    return value ? String(value).trim().toUpperCase().replace(/\s+/g, '_') : null;
}

async function getElectionIdsForUser({ role, faculty, status = null, scope = 'view' }) {
    const query = status ? { status } : {};
    const elections = await Election.find(query)
        .select('ballotId restrictedToFaculty voterRestriction status')
        .lean();

    const policyCheck = scope === 'participate'
        ? electionPolicies.canParticipateInElection
        : electionPolicies.canViewElection;

    return elections
        .filter((election) =>
        policyCheck({
            userRole: role,
            userFaculty: faculty,
            election,
        })
        )
        .map((election) => election.ballotId)
        .filter(Boolean);
}

async function countElectionsForUser({ role, faculty, status = null, scope = 'view' }) {
    const electionIds = await getElectionIdsForUser({ role, faculty, status, scope });
    return electionIds.length;
}

async function countActiveCandidatesForElectionIds(electionIds) {
    if (!Array.isArray(electionIds) || electionIds.length === 0) return 0;

    const elections = await Election.find({ ballotId: { $in: electionIds }, status: 'open' })
        .select('contests.candidates.studentUserId contests.candidates.email contests.candidates.studentNumber')
        .lean();

    const candidateKeys = new Set();
    elections.forEach((election) => {
        (election.contests || []).forEach((contest) => {
            (contest.candidates || []).forEach((candidate) => {
                const candidateKey = candidate.studentUserId || candidate.email || candidate.studentNumber;
                if (candidateKey) candidateKeys.add(String(candidateKey));
            });
        });
    });

    return candidateKeys.size;
}

function buildRegisteredVoterFilter(actorRole, actorFaculty) {
    const filter = {
        studentNumber: { $exists: true, $ne: '' },
        role: { $nin: ['usc_president', 'usc_vp'] },
    };

    if (actorRole === 'faculty_president' && actorFaculty) {
        filter.faculty = { $regex: new RegExp(`^${actorFaculty}$`, 'i') };
    }

    return filter;
}

function canManageRole(actor, targetRole) {
    const actorRole = normalizeRole(actor.role);
    const role = normalizeRole(targetRole);

    if (!role) return false;
    if (ADMIN_SUPER_ROLES.has(actorRole)) return true;
    if (ADMIN_SUPER_ROLES.has(role)) return false;

    const actorRank = ROLE_RANK[actorRole];
    const targetRank = ROLE_RANK[role];
    if (!actorRank || !targetRank) return false;

    return actorRank < targetRank;
}

function checkFacultyScope(actor, targetUser, targetRole) {
    const actorRole = normalizeRole(actor.role);
    if (ADMIN_SUPER_ROLES.has(actorRole) || actorRole === 'usc_president' || actorRole === 'usc_vp') return true;

    if (actorRole === 'faculty_president') {
        return normalizeFaculty(targetUser.faculty) === normalizeFaculty(actor.faculty);
    }

    return false;
}

async function getActorUser(req) {
    const actor = await User.findById(req.userId)
        .select('_id fullName email role faculty permissions')
        .lean();
    return actor;
}

const FACULTY_SCOPED_ROLES = new Set(['faculty_president', 'councillor', 'meeting_chair']);

async function assignUserRole({ actor, targetUserId, targetRole, reason = '', contextElectionId = null, faculty = null }) {
    if (String(actor?._id) === String(targetUserId)) {
        const err = new Error('You cannot change your own role.');
        err.status = 400;
        throw err;
    }

    const normalizedTargetRole = normalizeRole(targetRole);
    const targetUser = await User.findById(targetUserId).select('_id role faculty studentNumber permissions').lean();
    if (!targetUser) {
        const err = new Error('Target user not found');
        err.status = 404;
        throw err;
    }

    if (!DELEGABLE_ROLES.has(normalizedTargetRole) && !ADMIN_SUPER_ROLES.has(normalizedTargetRole)) {
        const err = new Error(`Role "${targetRole}" is not assignable.`);
        err.status = 400;
        throw err;
    }

    if (normalizedTargetRole === 'candidate') {
        const err = new Error('Candidate role is managed automatically by election status and cannot be assigned manually.');
        err.status = 400;
        throw err;
    }

    if (normalizeRole(targetUser.role) === 'candidate' && normalizedTargetRole !== 'student') {
        const err = new Error('Candidate accounts cannot be assigned admin or executive roles while they are active candidates.');
        err.status = 400;
        throw err;
    }

    if (ADMIN_RELATED_ROLES.has(normalizedTargetRole) && normalizeRole(targetUser.role) === 'candidate') {
        const err = new Error('Candidates can never have admin-related roles.');
        err.status = 400;
        throw err;
    }

    if (normalizedTargetRole !== 'student' && !STUDENT_EXEMPT_ROLES.has(normalizedTargetRole)) {
        if (!targetUser.studentNumber) {
            const err = new Error('This role requires a valid student account (student number is missing).');
            err.status = 400;
            throw err;
        }
    }

    if (!canManageRole(actor, targetRole)) {
        const err = new Error('You do not have permission to assign this role.');
        err.status = 403;
        throw err;
    }

    if (!checkFacultyScope(actor, targetUser, targetRole)) {
        const err = new Error('You do not have faculty scope to assign this role.');
        err.status = 403;
        throw err;
    }

    const fromRole = targetUser.role || null;
    const setFields = {
        role: normalizedTargetRole,
        grantedBy: actor._id,
        grantedAt: new Date(),
    };
    if (faculty) setFields.faculty = String(faculty).trim().toUpperCase().replace(/\s+/g, '_');
    const historyEntry = {
        from: fromRole,
        to: targetRole,
        by: actor._id,
        reason,
        timestamp: new Date(),
    };
    if (contextElectionId) historyEntry.contextElectionId = contextElectionId;

    const shouldGrantStudentPermission = normalizedTargetRole !== 'student' && !STUDENT_EXEMPT_ROLES.has(normalizedTargetRole);
    const updateOps = {
        $set: setFields,
        $push: { roleHistory: historyEntry },
    };
    if (shouldGrantStudentPermission) {
        updateOps.$addToSet = { permissions: 'student' };
    } else {
        updateOps.$pull = { permissions: 'student' };
    }

    await User.updateOne(
        { _id: targetUserId },
        updateOps,
        { runValidators: false, bypassDocumentValidation: true }
    );
}

// 1. Require the elections router
const electionsRouter = electionsModule;

// 2. Initialize Express
const app = express();

// 3. Set up Middleware
app.use(cors());
app.use(express.json());

// 4. Register the elections router (ONCE only)
app.use('/api/elections', electionsRouter);


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

        const authRoles = Array.from(new Set([
            user.role,
            ...(Array.isArray(user.permissions) ? user.permissions : []),
        ].filter(Boolean)));

        const token = jwt.sign(
            { userId: user._id, role: user.role, roles: authRoles },
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

app.get('/api/admin/stats', authMiddleware, requireRole('admin', 'usc_admin', 'usc_president', 'usc_vp', 'faculty_president'), async (req, res) => {
    try {
        const actorRole = normalizeRole(req.role);
        const actorFaculty = normalizeFaculty(req.faculty);
        const visibleElectionIds = await getElectionIdsForUser({
            role: actorRole,
            faculty: actorFaculty,
            scope: 'view',
        });

        const totalElections = visibleElectionIds.length;
        const totalCandidates = await countActiveCandidatesForElectionIds(visibleElectionIds);
        const openElections = await countElectionsForUser({
            role: actorRole,
            faculty: actorFaculty,
            status: 'open',
            scope: 'view',
        });

        const voterFilter = buildRegisteredVoterFilter(actorRole, actorFaculty);
        const registeredVoters = await User.countDocuments(voterFilter);
        const totalVotes = visibleElectionIds.length > 0
            ? await VoteReceipt.countDocuments({ electionId: { $in: visibleElectionIds } })
            : 0;

        res.json({
            totalElections,
            totalCandidates,
            registeredVoters,
            totalVotes,
            openElections,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Access delegation endpoint with hierarchy enforcement.
app.post('/api/admin/access/delegate', authMiddleware, requireRole('admin', 'usc_admin', 'usc_president', 'usc_vp', 'faculty_president'), async (req, res) => {
    try {
        const actor = await getActorUser(req);
        if (!actor) return res.status(401).json({ error: 'Actor not found' });

        const { targetUserId, targetRole, reason = '', faculty } = req.body;
        if (!targetUserId || !targetRole) {
            return res.status(400).json({ error: 'targetUserId and targetRole are required' });
        }
        if (FACULTY_SCOPED_ROLES.has(String(targetRole).toLowerCase()) && !faculty) {
            return res.status(400).json({ error: `faculty is required when assigning role "${targetRole}"` });
        }

        await assignUserRole({
            actor,
            targetUserId,
            targetRole,
            reason,
            faculty: faculty || null,
        });

        res.json({ success: true, message: `Role updated to ${targetRole}` });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to delegate access' });
    }
});

// Revoke delegated access back to student role.
app.post('/api/admin/access/revoke', authMiddleware, requireRole('admin', 'usc_admin', 'usc_president', 'usc_vp', 'faculty_president'), async (req, res) => {
    try {
        const actor = await getActorUser(req);
        if (!actor) return res.status(401).json({ error: 'Actor not found' });

        const { targetUserId, reason = '' } = req.body;
        if (!targetUserId) {
            return res.status(400).json({ error: 'targetUserId is required' });
        }

        await assignUserRole({
            actor,
            targetUserId,
            targetRole: 'student',
            reason: reason || 'Access revoked',
        });

        res.json({ success: true, message: 'Access revoked and role reverted to student' });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to revoke access' });
    }
});

// Apply election winners role updates only after election is closed.
app.post('/api/admin/elections/:ballotId/winners/roles', authMiddleware, async (req, res) => {
    try {
        const actor = await getActorUser(req);
        if (!actor) return res.status(401).json({ error: 'Actor not found' });

        const election = await Election.findOne({ ballotId: req.params.ballotId }).lean();
        if (!election) return res.status(404).json({ error: 'Election not found' });
        if (election.status !== 'closed') {
            return res.status(400).json({ error: 'Winner role updates are only allowed after election is closed.' });
        }

        const { assignments = [], reason = '' } = req.body;
        if (!Array.isArray(assignments) || assignments.length === 0) {
            return res.status(400).json({ error: 'assignments array is required' });
        }

        for (const assignment of assignments) {
            if (!assignment.userId || !assignment.role) {
                return res.status(400).json({ error: 'Each assignment needs userId and role' });
            }

            await assignUserRole({
                actor,
                targetUserId: assignment.userId,
                targetRole: assignment.role,
                reason: reason || `Winner role applied for election ${req.params.ballotId}`,
                contextElectionId: req.params.ballotId,
            });
        }

        res.json({ success: true, message: 'Winner role assignments applied' });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to apply winner roles' });
    }
});

// Admin: initialize election on blockchain
app.post('/api/admin/elections/init', authMiddleware, requireRole('admin'), async (req, res) => {
    const { electionId, electionName } = req.body;
    try {
        if (!FABRIC_ENABLED) {
            return res.status(503).json({ error: 'Blockchain integration is disabled in this environment.' });
        }

        const election = await Election.findOne({ ballotId: electionId }).lean();
        if (!election) {
            return res.status(404).json({ error: 'Election not found' });
        }

        await initElection(
            String(election.ballotId),
            String(election.title || electionName || electionId),
            new Date(election.startDate).toISOString(),
            new Date(election.endDate).toISOString(),
            JSON.stringify(election.contests || [])
        );
        res.json({ success: true, message: `Election ${electionId} initialized on blockchain` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to initialize election', details: err.message });
    }
});

// Admin: get election results from blockchain
// Replace the existing GET /api/admin/results/:electionId route in backend/src/server.js
// with this enhanced version. It maps candidateIDs back to candidate names using the
// election data from MongoDB, and returns the full vote timeline from CouchDB/blockchain.

// ─── PASTE THIS ROUTE into server.js (replacing the existing /api/admin/results/:electionId) ───

app.get('/api/admin/results/:electionId', authMiddleware, requireRole('admin', 'usc_admin', 'usc_president', 'usc_vp', 'faculty_president'), async (req, res) => {
    const { electionId } = req.params;
    try {
        // 1. Load election metadata from MongoDB for candidate name lookup
        const election = await Election.findOne({ ballotId: electionId }).lean();
        if (!election) {
            return res.status(404).json({ error: 'Election not found' });
        }

        // 2. Build a map of candidateId → candidate info (name, description, etc.)
        // CouchDB vote records store e.g. "c0-1" as the candidateID
        const candidateMap = {};
        (election.contests || []).forEach((contest) => {
            (contest.candidates || []).forEach((candidate) => {
                candidateMap[candidate.id] = {
                    name: candidate.name,
                    description: candidate.description || '',
                    faculty: candidate.faculty || '',
                    studentNumber: candidate.studentNumber || '',
                    contestId: contest.id,
                    contestTitle: contest.title,
                    ruleType: contest.ruleType,
                };
            });
        });

        let contestResults = [];
        let allVotes = [];
        let totalVotes = 0;

        if (FABRIC_ENABLED) {
            try {
                // 3. Query raw tally from blockchain (returns { candidateId: count })
                const tally = await queryResults(electionId);

                // 4. Also fetch individual votes for the timeline
                // We'll query CouchDB directly via the fabric evaluateTransaction
                // The QueryResults chaincode function returns aggregated tallies.
                // For timeline data, we use a dedicated chaincode call if available,
                // or we build from the tally alone.
                
                // 5. Build per-contest results with candidate names resolved
                const contestMap = {};
                (election.contests || []).forEach((contest) => {
                    contestMap[contest.id] = {
                        contestId: contest.id,
                        contestTitle: contest.title,
                        ruleType: contest.ruleType,
                        candidates: contest.candidates.map(c => ({
                            candidateId: c.id,
                            name: c.name,
                            description: c.description || '',
                            votes: tally[c.id] || 0,
                        })),
                    };
                });

                contestResults = Object.values(contestMap);
                totalVotes = Object.values(tally).reduce((s, v) => s + v, 0);

            } catch (bcErr) {
                console.warn('Blockchain unavailable for results, using empty tally:', bcErr.message);
                // Fall back to empty tally with correct candidate names
                contestResults = (election.contests || []).map(contest => ({
                    contestId: contest.id,
                    contestTitle: contest.title,
                    ruleType: contest.ruleType,
                    candidates: (contest.candidates || []).map(c => ({
                        candidateId: c.id,
                        name: c.name,
                        description: c.description || '',
                        votes: 0,
                    })),
                }));
                totalVotes = 0;
            }
        } else {
            // Blockchain disabled — return skeleton with 0 votes
            contestResults = (election.contests || []).map(contest => ({
                contestId: contest.id,
                contestTitle: contest.title,
                ruleType: contest.ruleType,
                candidates: (contest.candidates || []).map(c => ({
                    candidateId: c.id,
                    name: c.name,
                    description: c.description || '',
                    votes: 0,
                })),
            }));
            totalVotes = 0;
        }

        // 6. Fetch vote receipts from MongoDB for the timeline
        // (These are stored when a vote is cast successfully — see recordVoteReceipt)
        const { VoteReceipt } = require('./db');
        const voteReceipts = await VoteReceipt.find({ electionId })
            .select('timestamp')
            .sort({ timestamp: 1 })
            .lean();

        allVotes = voteReceipts.map(r => ({ castAt: r.timestamp }));

        // 7. Count registered voters for turnout calculation
        const registeredVoters = await User.countDocuments({
            studentNumber: { $exists: true, $ne: '' },
            role: { $nin: ['usc_president', 'usc_vp'] },
        });

        res.json({
            electionId,
            title: election.title,
            status: election.status,
            startDate: election.startDate,
            endDate: election.endDate,
            totalVotes,
            results: contestResults,
            votes: allVotes,           // for timeline chart
            registeredVoters,
        });

    } catch (err) {
        console.error('Results endpoint error:', err);
        res.status(500).json({ error: 'Failed to fetch results', details: err.message });
    }
});

// Admin: search ALL users (super-admin only)
app.get('/api/admin/users/search', authMiddleware, requireRole('admin', 'faculty_president'), async (req, res) => {
    const { q } = req.query;
    const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
        const actor = await getActorUser(req);
        const term = (q || '').trim();
        const filter = term
            ? {
                $or: [
                    { fullName: new RegExp(escapeRegex(term), 'i') },
                    { email: new RegExp(escapeRegex(term), 'i') },
                    { studentNumber: new RegExp(escapeRegex(term), 'i') },
                ],
            }
            : {};
        
        // Faculty presidents can only search users in their faculty
        if (actor.role && normalizeRole(actor.role) === 'faculty_president') {
            filter.faculty = normalizeFaculty(actor.faculty);
        }
        
        const users = await User.find(filter)
            .select('_id fullName email studentNumber faculty role')
            .sort({ fullName: 1 })
            .limit(20)
            .lean();
        res.json({ users });
    } catch (err) {
        console.error('User search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Admin: search students (by name, email, or studentNumber)
app.get('/api/admin/students/search', authMiddleware, requireRole('admin', 'usc_admin', 'usc_president', 'usc_vp', 'faculty_president'), async (req, res) => {
    const { q, faculty } = req.query;

    const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const buildFacultyRegex = (value) => {
        const normalized = normalizeFaculty(value);
        if (!normalized) return null;

        const tokens = normalized.split('_').filter(Boolean).map((part) => escapeRegex(part));
        if (tokens.length === 0) return null;

        const tokenSequence = tokens.join('[\\s_-]+');
        return new RegExp(`(^|[\\s_-])${tokenSequence}($|[\\s_-])`, 'i');
    };

    try {
        const term = (q || '').trim();
        const normalizedFaculty = faculty ? String(faculty).trim().toUpperCase().replace(/\s+/g, '_') : null;
        const baseFilter = { role: 'student' };
        const actorRole = normalizeRole(req.role);
        const actorFaculty = req.faculty ? String(req.faculty).trim().toUpperCase().replace(/\s+/g, '_') : null;

        if (actorRole === 'faculty_president') {
            if (!actorFaculty) {
                return res.status(403).json({ error: 'Faculty president account is missing faculty scope.' });
            }
            const facultyRegex = buildFacultyRegex(actorFaculty);
            if (facultyRegex) {
                baseFilter.faculty = { $regex: facultyRegex };
            }
        } else if (normalizedFaculty) {
            const facultyRegex = buildFacultyRegex(normalizedFaculty);
            if (facultyRegex) {
                baseFilter.faculty = { $regex: facultyRegex };
            }
        }
        const filter = term
            ? {
                ...baseFilter,
                $or: [
                    { fullName: new RegExp(escapeRegex(term), 'i') },
                    { email: new RegExp(escapeRegex(term), 'i') },
                    { studentNumber: new RegExp(escapeRegex(term), 'i') },
                ],
            }
            : baseFilter;

        const students = await User.find(filter)
            .select('_id fullName email studentNumber faculty')
            .sort({ fullName: 1 })
            .limit(20)
            .lean();

        res.json({ students, sourceDb: mongoose.connection.name });
    } catch (err) {
        console.error('Student search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ─── STUDENT ROUTES ──────────────────────────────────────────────────────────

const ALL_VOTER_ROLES = ['student', 'candidate', 'councillor', 'meeting_chair', 'faculty_president', 'usc_president', 'usc_vp', 'admin', 'usc_admin'];

app.get('/api/student/stats', authMiddleware, requireRole(...ALL_VOTER_ROLES), async (req, res) => {
    try {
        const userRole = normalizeRole(req.role);
        const userFaculty = normalizeFaculty(req.faculty);

        const ongoingElections = await countElectionsForUser({
            role: userRole,
            faculty: userFaculty,
            status: 'open',
            scope: 'participate',
        });
        const upcomingElections = await countElectionsForUser({
            role: userRole,
            faculty: userFaculty,
            status: 'upcoming',
            scope: 'participate',
        });
        const pastElections = await countElectionsForUser({
            role: userRole,
            faculty: userFaculty,
            status: 'closed',
            scope: 'participate',
        });
        const votesCast = await VoteReceipt.countDocuments({ userId: req.userId });
        res.json({
            ongoingElections,
            votesCast,
            upcomingElections,
            pastElections,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch student stats' });
    }
});

app.get('/api/voting-receipts', authMiddleware, requireRole(...ALL_VOTER_ROLES), async (req, res) => {
    try {
        const receipts = await VoteReceipt.find({ userId: req.userId })
            .select('electionId transactionId timestamp voteData')
            .sort({ timestamp: -1 })
            .lean();

        const electionIds = [...new Set(receipts.map((receipt) => receipt.electionId).filter(Boolean))];
        const elections = electionIds.length > 0
            ? await Election.find({ ballotId: { $in: electionIds } }).select('ballotId title').lean()
            : [];

        const titleByBallotId = new Map(elections.map((election) => [election.ballotId, election.title]));
        const mappedReceipts = receipts.map((receipt) => ({
            ballotId: receipt.electionId,
            ballotTitle: titleByBallotId.get(receipt.electionId) || receipt.electionId,
            transactionId: receipt.transactionId,
            timestamp: receipt.timestamp,
            voteData: receipt.voteData,
        }));

        res.json({ receipts: mappedReceipts });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5002;
connectDB()
    .then(() => {
        console.log('✅ MongoDB connected!');
        console.log(`🗄️ MongoDB database: ${mongoose.connection.name}`);
        console.log(`🔗 Fabric mode: ${FABRIC_ENABLED ? 'enabled' : 'disabled'}`);
        return reconcileCandidateRoles()
            .catch((err) => {
                console.warn('Candidate role reconciliation skipped at startup:', err.message);
            })
            .then(() => {
                app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
            });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err);
        process.exit(1);
    });