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
const { __testables: electionPolicies } = require('./routes/elections');
const FABRIC_ENABLED = (process.env.FABRIC_ENABLED || 'true').toLowerCase() !== 'false';

const ADMIN_SUPER_ROLES = new Set(['admin', 'usc_admin']);
const DELEGABLE_ROLES = new Set([
    'usc_president',
    'usc_vp',
    'faculty_president',
    'councillor',
    'meeting_chair',
    'candidate',
    'student',
]);
const ROLE_RANK = {
    usc_president: 1,
    usc_vp: 2,
    faculty_president: 3,
    councillor: 4,
    meeting_chair: 4,
    candidate: 5,
    student: 6,
};

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

    const targetUser = await User.findById(targetUserId).select('_id role faculty').lean();
    if (!targetUser) {
        const err = new Error('Target user not found');
        err.status = 404;
        throw err;
    }

    if (!DELEGABLE_ROLES.has(normalizeRole(targetRole)) && !ADMIN_SUPER_ROLES.has(normalizeRole(targetRole))) {
        const err = new Error(`Role "${targetRole}" is not assignable.`);
        err.status = 400;
        throw err;
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
        role: targetRole,
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

    await User.updateOne(
        { _id: targetUserId },
        {
            $set: setFields,
            $push: { roleHistory: historyEntry },
        },
        { runValidators: false, bypassDocumentValidation: true }
    );
}

// 1. Require the elections router
const electionsRouter = require('./routes/elections');

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
        const openElections = await countElectionsForUser({
            role: actorRole,
            faculty: actorFaculty,
            status: 'open',
            scope: 'view',
        });

        // Voter count: faculty president sees only their faculty's students
        const voterFilter = (actorRole === 'faculty_president' && actorFaculty)
            ? { role: 'student', faculty: { $regex: new RegExp(`^${actorFaculty}$`, 'i') } }
            : { role: 'student' };
        const registeredVoters = await User.countDocuments(voterFilter);
        const totalVotes = visibleElectionIds.length > 0
            ? await VoteReceipt.countDocuments({ electionId: { $in: visibleElectionIds } })
            : 0;

        res.json({
            totalElections,
            totalCandidates: 0,
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
        if (!FABRIC_ENABLED) {
            return res.status(503).json({ error: 'Blockchain integration is disabled in this environment.' });
        }
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
        console.warn('Blockchain unavailable, returning empty results:', err.message);
        res.json({
            electionId,
            title: 'Election Results',
            totalVotes: 0,
            results: [],
        });
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
        app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err);
        process.exit(1);
    });