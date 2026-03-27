// backend/src/routes/elections.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // <-- ADDED: For secure voter hashing
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const Election = require('../models/Election');


//
const { User, hasUserVoted, recordVoteReceipt } = require('../db');
const { initElection, getElection } = require('../services/fabricService');
const { submitVoteTransaction } = require('../services/fabricService');

const FABRIC_ENABLED = (process.env.FABRIC_ENABLED || 'true').toLowerCase() !== 'false';

const KNOWN_FACULTIES = [
    'SCIENCE',
    'SOCIAL_SCIENCE',
    'FIMS',
    'NURSING',
    'MEDICAL_SCIENCE',
    'HEALTH_SCIENCE',
    'ENGINEERING',
    'ARTS_AND_HUMANITIES',
    'MUSIC',
    'EDUCATION',
    'LAW',
    'IVEY',
];
const FACULTY_EXEC_ROLES = new Set(['faculty_president', 'councillor', 'meeting_chair']);

const normalizeFaculty = (value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toUpperCase().replace(/\s+/g, '_');
    return normalized || null;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeEmail = (value) => (value ? String(value).trim().toLowerCase() : null);
const normalizeStudentNumber = (value) => (value ? String(value).trim() : null);
const toPlain = (value) => (value && typeof value.toObject === 'function' ? value.toObject() : value);
const normalizeRole = (value) => (value ? String(value).trim().toLowerCase() : '');
const facultyTokens = (value) => (normalizeFaculty(value) || '').split('_').filter(Boolean);

const isPrivilegedViewer = (role) => ['admin', 'usc_admin'].includes(normalizeRole(role));
const isHigherThanFacultyPresident = (role) => ['usc_president', 'usc_vp'].includes(normalizeRole(role));
const isFacultyExecRole = (role) => FACULTY_EXEC_ROLES.has(normalizeRole(role));
const canManageElections = (role) => ['admin', 'usc_admin', 'faculty_president', 'usc_president', 'usc_vp'].includes(normalizeRole(role));

const matchesFacultyRestriction = (userFaculty, restrictedToFaculty) => {
    const normalizedRestriction = normalizeFaculty(restrictedToFaculty);
    if (!normalizedRestriction) return true;
    const normalizedUserFaculty = normalizeFaculty(userFaculty);
    if (!normalizedUserFaculty) return false;
    if (normalizedUserFaculty === normalizedRestriction) return true;

    const userTokens = facultyTokens(normalizedUserFaculty);
    const restrictionTokens = facultyTokens(normalizedRestriction);
    return restrictionTokens.every((token) => userTokens.includes(token));
};

const passesVoterRestriction = (userRole, voterRestriction) => {
    const normalizedRestriction = voterRestriction || 'all_students';
    if (normalizedRestriction === 'faculty_exec_only') {
        return FACULTY_EXEC_ROLES.has(normalizeRole(userRole));
    }
    return true;
};

const canParticipateInElection = ({ userRole, userFaculty, election }) => {
    const role = normalizeRole(userRole);

    if (isPrivilegedViewer(role)) return true;
    if (!matchesFacultyRestriction(userFaculty, election.restrictedToFaculty)) return false;

    // Higher-than-faculty-president roles can inspect but not vote in faculty-restricted ballots.
    if (isHigherThanFacultyPresident(role) && normalizeFaculty(election.restrictedToFaculty)) {
        return false;
    }

    if ((election.voterRestriction || 'all_students') === 'faculty_exec_only') {
        return isFacultyExecRole(role);
    }

    // For faculty ballots open to all_students, both students and faculty execs in that faculty can vote.
    return true;
};

const canViewElection = ({ userRole, userFaculty, election }) => {
    const role = normalizeRole(userRole);

    if (isPrivilegedViewer(role) || isHigherThanFacultyPresident(role)) return true;
    if (!matchesFacultyRestriction(userFaculty, election.restrictedToFaculty)) return false;

    // For non-exec students, hide exec-only elections.
    if ((election.voterRestriction || 'all_students') === 'faculty_exec_only' && !isFacultyExecRole(role)) {
        return false;
    }

    return true;
};

async function sanitizeContestsToVerifiedStudents(contests) {
    const safeContests = (contests || []).map((contest) => {
        const plainContest = toPlain(contest);
        return {
            ...plainContest,
            candidates: (plainContest.candidates || []).map((candidate) => toPlain(candidate)),
        };
    });

    const refs = [];
    safeContests.forEach((contest) => {
        (contest.candidates || []).forEach((candidate) => {
            refs.push({
                studentUserId: candidate.studentUserId ? String(candidate.studentUserId) : null,
                email: normalizeEmail(candidate.email),
                studentNumber: normalizeStudentNumber(candidate.studentNumber),
            });
        });
    });

    const clauses = [];
    refs.forEach((ref) => {
        if (ref.studentUserId) clauses.push({ _id: ref.studentUserId });
        if (ref.email) clauses.push({ email: ref.email });
        if (ref.studentNumber) clauses.push({ studentNumber: ref.studentNumber });
    });

    // If contests only contain legacy free-text candidates, remove them from read output.
    if (clauses.length === 0) {
        return safeContests.map((contest) => ({ ...contest, candidates: [] }));
    }

    const students = await User.find({
        role: 'student',
        $or: clauses,
    }).select('_id email studentNumber').lean();

    const validIds = new Set(students.map((s) => String(s._id)));
    const validEmails = new Set(students.map((s) => normalizeEmail(s.email)).filter(Boolean));
    const validStudentNumbers = new Set(students.map((s) => normalizeStudentNumber(s.studentNumber)).filter(Boolean));

    return safeContests.map((contest) => {
        const seenCandidates = new Set();

        return {
            ...contest,
            candidates: (contest.candidates || []).filter((candidate) => {
                const candidateId = candidate.studentUserId ? String(candidate.studentUserId) : null;
                const candidateEmail = normalizeEmail(candidate.email);
                const candidateStudentNumber = normalizeStudentNumber(candidate.studentNumber);
                const candidateKey = candidateId || candidateEmail || candidateStudentNumber;
                const isValid = (
                    (candidateId && validIds.has(candidateId)) ||
                    (candidateEmail && validEmails.has(candidateEmail)) ||
                    (candidateStudentNumber && validStudentNumbers.has(candidateStudentNumber))
                );

                if (!isValid || !candidateKey || seenCandidates.has(candidateKey)) {
                    return false;
                }

                seenCandidates.add(candidateKey);
                return true;
            }),
        };
    });
}

async function normalizeAndValidateContests(contests, defaultRestriction) {
    const candidateRefs = [];

    contests.forEach((contest, ci) => {
        (contest.candidates || []).forEach((candidate, idx) => {
            candidateRefs.push({
                ci,
                idx,
                studentUserId: candidate.studentUserId || null,
                email: normalizeEmail(candidate.email),
                studentNumber: normalizeStudentNumber(candidate.studentNumber),
                fallbackName: candidate.name || `Candidate ${idx + 1}`,
                description: candidate.description || '',
            });
        });
    });

    for (const ref of candidateRefs) {
        if (!ref.studentUserId && !ref.email && !ref.studentNumber) {
            throw new Error(`Each candidate must be selected from students database (missing student reference for ${ref.fallbackName}).`);
        }
    }

    const orClauses = [];
    candidateRefs.forEach((ref) => {
        if (ref.studentUserId) orClauses.push({ _id: ref.studentUserId });
        if (ref.email) orClauses.push({ email: ref.email });
        if (ref.studentNumber) orClauses.push({ studentNumber: ref.studentNumber });
    });

    const students = await User.find({
        role: 'student',
        $or: orClauses,
    }).select('_id fullName email studentNumber faculty role').lean();

    const byId = new Map(students.map((s) => [String(s._id), s]));
    const byEmail = new Map(students.map((s) => [normalizeEmail(s.email), s]));
    const byStudentNumber = new Map(students.map((s) => [normalizeStudentNumber(s.studentNumber), s]));

    const normalizedContests = contests.map((contest, ci) => {
        const seenCandidates = new Set();

        return {
            id: contest.id || `contest-${ci + 1}`,
            title: contest.title,
            instructionText: contest.instructionText || '',
            ruleType: contest.ruleType || 'single',
            required: contest.required !== false,
            maxSelections:
                contest.ruleType === 'multi' && contest.maxSelections
                    ? Number(contest.maxSelections)
                    : null,
            winnerRole: contest.winnerRole || null,
            restrictionFaculty: normalizeFaculty(contest.restrictionFaculty) || defaultRestriction || null,
            candidates: (contest.candidates || []).map((candidate, idx) => {
                const user =
                    (candidate.studentUserId && byId.get(String(candidate.studentUserId))) ||
                    (candidate.email && byEmail.get(normalizeEmail(candidate.email))) ||
                    (candidate.studentNumber && byStudentNumber.get(normalizeStudentNumber(candidate.studentNumber)));

                if (!user) {
                    throw new Error(`Candidate "${candidate.name || `#${idx + 1}`}" is not a valid student in database.`);
                }

                const candidateKey = String(user._id);
                if (seenCandidates.has(candidateKey)) {
                    throw new Error(`Candidate "${user.fullName}" is duplicated in contest "${contest.title}".`);
                }
                seenCandidates.add(candidateKey);

                const candidateFaculty = normalizeFaculty(user.faculty);
                const requiredFaculty = normalizeFaculty(contest.restrictionFaculty) || defaultRestriction || null;
                if (requiredFaculty && !matchesFacultyRestriction(candidateFaculty, requiredFaculty)) {
                    throw new Error(
                        `Candidate "${user.fullName}" is not in required faculty "${requiredFaculty}" for contest "${contest.title}".`
                    );
                }

                return {
                    id: candidate.id || `c${ci}-${idx}`,
                    name: user.fullName,
                    description: candidate.description || `${user.faculty || ''} — ${user.studentNumber || ''}`.trim(),
                    studentUserId: String(user._id),
                    email: user.email,
                    studentNumber: user.studentNumber,
                    faculty: user.faculty,
                };
            }),
        };
    });

    return normalizedContests;
}

// ── GET /api/elections ───────────────────────────────────────────────────────
// Admin: all elections. Student: only elections they're eligible for.
router.get('/', authMiddleware, async (req, res) => {
    try {
        let query = {};
        const role = normalizeRole(req.role);
        const manageScope = String(req.query.scope || '').toLowerCase() === 'manage';

        if (manageScope && canManageElections(role)) {
            if (isPrivilegedViewer(role) || isHigherThanFacultyPresident(role)) {
                query = {};
            } else if (role === 'faculty_president') {
                query = {
                    restrictedToFaculty: normalizeFaculty(req.faculty),
                };
            }
        } else

        if (!isPrivilegedViewer(role) && !isHigherThanFacultyPresident(role)) {
            const userFaculty = normalizeFaculty(req.faculty);
            const restrictionMatch = [
                { restrictedToFaculty: null },
                { restrictedToFaculty: '' },
                { restrictedToFaculty: { $exists: false } },
            ];

            if (userFaculty) {
                restrictionMatch.push({
                    restrictedToFaculty: { $regex: `^${escapeRegex(userFaculty)}$`, $options: 'i' },
                });
            }

            // Student sees only open elections eligible for their faculty.
            query = {
                status: 'open',
                $or: restrictionMatch,
            };

            if (!isFacultyExecRole(role)) {
                query.voterRestriction = { $ne: 'faculty_exec_only' };
            }
        } else if (isHigherThanFacultyPresident(role)) {
            // Higher roles can inspect ballots across faculties, but participation checks still apply at submit time.
            query = { status: 'open' };
        }

        const elections = await Election.find(query).sort({ createdAt: -1 });
        const sanitizedElections = await Promise.all(
            elections.map(async (election) => {
                const plain = election.toObject();
                plain.contests = await sanitizeContestsToVerifiedStudents(plain.contests || []);
                return plain;
            })
        );

        res.json({ elections: sanitizedElections });
    } catch (err) {
        console.error('GET /elections error:', err);
        res.status(500).json({ error: 'Failed to fetch elections' });
    }
});

// ── GET /api/elections/current-active ──────────────────────────────────────
// Student: return latest open election they are eligible for.
router.get('/current-active', authMiddleware, async (req, res) => {
    try {
        const role = normalizeRole(req.role);
        const userFaculty = normalizeFaculty(req.faculty);
        const restrictionMatch = [
            { restrictedToFaculty: null },
            { restrictedToFaculty: '' },
            { restrictedToFaculty: { $exists: false } },
        ];

        if (userFaculty) {
            restrictionMatch.push({
                restrictedToFaculty: { $regex: `^${escapeRegex(userFaculty)}$`, $options: 'i' },
            });
        }

        const query = {
            status: 'open',
            $or: restrictionMatch,
        };

        if (!isFacultyExecRole(role)) {
            query.voterRestriction = { $ne: 'faculty_exec_only' };
        }

        const election = await Election.findOne(query).sort({ startDate: -1, createdAt: -1 });

        if (!election) {
            return res.json({ election: null });
        }

        return res.json({ election });
    } catch (err) {
        console.error('GET /elections/current-active error:', err);
        res.status(500).json({ error: 'Failed to fetch current active election' });
    }
});

// ── GET /api/elections/:ballotId ─────────────────────────────────────────────
router.get('/:ballotId', authMiddleware, async (req, res) => {
    try {
        const election = await Election.findOne({ ballotId: req.params.ballotId });
        if (!election) return res.status(404).json({ error: 'Election not found' });

        // Students: verify they're allowed to view this ballot
        if (!canViewElection({ userRole: req.role, userFaculty: req.faculty, election })) {
            return res.status(403).json({ error: 'You are not eligible for this ballot' });
        }

        let blockchainData = null;
        if (FABRIC_ENABLED) {
            try {
                // Ask the smart contract for the official ledger state
                blockchainData = await getElection(req.params.ballotId);
            } catch (bcErr) {
                if (!bcErr.isFabricUnavailable) {
                    console.warn(`Could not fetch blockchain data for ${req.params.ballotId}:`, bcErr.message);
                }
                // We don't fail the whole request here, just in case the network is temporarily down
            }
        }

        const responseData = {
            ...election.toObject(), // Convert Mongoose document to standard JSON
            contests: await sanitizeContestsToVerifiedStudents(election.contests || []),
            blockchainState: blockchainData,
        };

        res.json(responseData);

    } catch (err) {
        console.error('GET /elections/:ballotId error:', err);
        res.status(500).json({ error: 'Failed to fetch election' });
    }
});

// ── POST /api/elections ──────────────────────────────────────────────────────
// Admin only: create a new election + initialize on blockchain
router.post('/', authMiddleware, async (req, res) => {
    const {
        title,
        electionType,   // 'presidential' | 'faculty'
        purpose,
        managedByRole,
        winnerRoleDefault,
        startDate,
        endDate,
        restrictedToFaculty, // null for presidential, faculty string for faculty elections
        voterRestriction,
        contests,            // array of contest objects from the frontend form
    } = req.body;

    if (!canManageElections(req.role)) {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }

    if (!title || !electionType || !startDate || !endDate) {
        return res.status(400).json({ error: 'title, electionType, startDate, and endDate are required' });
    }

    if (!contests || contests.length === 0) {
        return res.status(400).json({ error: 'At least one contest is required' });
    }

    // Presidential elections are open to everyone — ignore any restriction
    const finalRestriction = electionType === 'presidential' ? null : normalizeFaculty(restrictedToFaculty);

    if (normalizeRole(req.role) === 'faculty_president') {
        const actorFaculty = normalizeFaculty(req.faculty);
        if (electionType !== 'faculty') {
            return res.status(403).json({ error: 'Faculty presidents can only create faculty elections.' });
        }
        if (!actorFaculty || finalRestriction !== actorFaculty) {
            return res.status(403).json({ error: 'Faculty presidents can only create elections for their own faculty.' });
        }
    }

    if (finalRestriction && !KNOWN_FACULTIES.includes(finalRestriction)) {
        return res.status(400).json({
            error: `Unknown faculty "${finalRestriction}". Valid values: ${KNOWN_FACULTIES.join(', ')}`,
        });
    }

    const finalVoterRestriction = voterRestriction || 'all_students';
    if (!['all_students', 'faculty_exec_only'].includes(finalVoterRestriction)) {
        return res.status(400).json({ error: 'Invalid voterRestriction value.' });
    }
    if (finalVoterRestriction === 'faculty_exec_only' && !finalRestriction) {
        return res.status(400).json({ error: 'faculty_exec_only requires restrictedToFaculty.' });
    }

    // Build ballot ID
    const ballotId = `ballot-${Date.now()}-${uuidv4().substring(0, 6)}`;

    try {
        const normalisedContests = await normalizeAndValidateContests(contests, finalRestriction);

        // 1. Save to MongoDB
        const election = await Election.create({
            ballotId,
            title,
            electionType,
            purpose: purpose || 'governance',
            managedByRole: managedByRole || 'usc_admin',
            winnerRoleDefault: winnerRoleDefault || 'student',
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: new Date(startDate) <= new Date() ? 'open' : 'upcoming',
            restrictedToFaculty: finalRestriction,
            voterRestriction: finalVoterRestriction,
            contests: normalisedContests,
            createdBy: req.userId,
        });

        // 2. Initialize on blockchain (non-blocking — if it fails we still have the DB record)
        // 2. Initialize on blockchain (non-blocking — if it fails we still have the DB record)
        if (FABRIC_ENABLED) {
            try {
                // FIXED: Passing all 5 arguments to Fabric so it doesn't crash
                await initElection(
                    String(ballotId), 
                    String(title), 
                    new Date(startDate).toISOString(), 
                    new Date(endDate).toISOString(), 
                    JSON.stringify(normalisedContests)
                );
                
                election.blockchainInitialized = true;
                await election.save();
                console.log(`Blockchain election initialized: ${ballotId}`);
            } catch (bcErr) {
                console.warn(`Blockchain init failed for ${ballotId} (will retry later):`, bcErr.message);
                // Don't fail the request — admin can retry via the reinit endpoint
            }
        }

        res.status(201).json({
            success: true,
            election,
            message: election.blockchainInitialized
                ? 'Election created and initialized on blockchain.'
                : 'Election created in DB. Blockchain initialization pending.',
        });
    } catch (err) {
        console.error('POST /elections error:', err);
        res.status(500).json({ error: 'Failed to create election', details: err.message });
    }
});

// ── PUT /api/elections/:ballotId ─────────────────────────────────────────────
// Admin only: edit an existing election (metadata + contests)
router.put('/:ballotId', authMiddleware, async (req, res) => {
    try {
        if (!canManageElections(req.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }

        const {
            title,
            startDate,
            endDate,
            status,
            purpose,
            managedByRole,
            winnerRoleDefault,
            restrictedToFaculty,
            voterRestriction,
            contests,
        } = req.body;

        const electionDoc = await Election.findOne({ ballotId: req.params.ballotId }).lean();
        if (!electionDoc) return res.status(404).json({ error: 'Election not found' });

        if (normalizeRole(req.role) === 'faculty_president') {
            const actorFaculty = normalizeFaculty(req.faculty);
            const electionFaculty = normalizeFaculty(electionDoc.restrictedToFaculty);
            if (!actorFaculty || electionFaculty !== actorFaculty) {
                return res.status(403).json({ error: 'Faculty presidents can only edit elections in their own faculty.' });
            }
        }

        const update = {};
        if (title) update.title = title;
        if (startDate) update.startDate = new Date(startDate);
        if (endDate) update.endDate = new Date(endDate);
        if (status) update.status = status;
        if (purpose) update.purpose = purpose;
        if (managedByRole) update.managedByRole = managedByRole;
        if (winnerRoleDefault) update.winnerRoleDefault = winnerRoleDefault;
        if (restrictedToFaculty !== undefined) update.restrictedToFaculty = normalizeFaculty(restrictedToFaculty);

        if (voterRestriction !== undefined) {
            if (!['all_students', 'faculty_exec_only'].includes(voterRestriction)) {
                return res.status(400).json({ error: 'Invalid voterRestriction value.' });
            }
            update.voterRestriction = voterRestriction;
        }

        const effectiveRestriction =
            update.restrictedToFaculty !== undefined
                ? update.restrictedToFaculty
                : electionDoc.restrictedToFaculty;

        const effectiveVoterRestriction =
            update.voterRestriction !== undefined
                ? update.voterRestriction
                : electionDoc.voterRestriction || 'all_students';

        if (effectiveVoterRestriction === 'faculty_exec_only' && !normalizeFaculty(effectiveRestriction)) {
            return res.status(400).json({ error: 'faculty_exec_only requires restrictedToFaculty.' });
        }

        if (contests !== undefined) {
            if (!Array.isArray(contests) || contests.length === 0) {
                return res.status(400).json({ error: 'contests must be a non-empty array' });
            }

            update.contests = await normalizeAndValidateContests(contests, normalizeFaculty(effectiveRestriction));
        }

        const election = await Election.findOneAndUpdate(
            { ballotId: req.params.ballotId },
            { $set: update },
            { returnDocument: 'after' }
        );

        if (!election) return res.status(404).json({ error: 'Election not found' });
        res.json({ success: true, election });
    } catch (err) {
        console.error('PUT /elections/:ballotId error:', err);
        res.status(500).json({ error: 'Failed to update election' });
    }
});

// ── DELETE /api/elections/:ballotId ──────────────────────────────────────────
router.delete('/:ballotId', authMiddleware, async (req, res) => {
    try {
        if (!canManageElections(req.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }

        if (normalizeRole(req.role) === 'faculty_president') {
            const electionToDelete = await Election.findOne({ ballotId: req.params.ballotId }).lean();
            if (!electionToDelete) return res.status(404).json({ error: 'Election not found' });
            if (normalizeFaculty(electionToDelete.restrictedToFaculty) !== normalizeFaculty(req.faculty)) {
                return res.status(403).json({ error: 'Faculty presidents can only delete elections in their own faculty.' });
            }
        }

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
router.post('/:ballotId/blockchain-init', authMiddleware, async (req, res) => {
    try {
        if (!canManageElections(req.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }

        if (!FABRIC_ENABLED) {
            return res.status(503).json({ error: 'Blockchain integration is disabled in this environment.' });
        }

        const election = await Election.findOne({ ballotId: req.params.ballotId });
        if (!election) return res.status(404).json({ error: 'Election not found' });

        if (normalizeRole(req.role) === 'faculty_president') {
            if (normalizeFaculty(election.restrictedToFaculty) !== normalizeFaculty(req.faculty)) {
                return res.status(403).json({ error: 'Faculty presidents can only initialize elections in their own faculty.' });
            }
        }

        // FIXED: Explicitly casting variables to strings and converting Mongoose Dates to ISO strings
        await initElection(
            String(election.ballotId), 
            String(election.title), 
            new Date(election.startDate).toISOString(), 
            new Date(election.endDate).toISOString(), 
            JSON.stringify(election.contests)
        );
        
        election.blockchainInitialized = true;
        await election.save();

        res.json({ success: true, message: `Election ${election.ballotId} initialized on blockchain` });
    } catch (err) {
        console.error('blockchain-init error:', err);
        res.status(500).json({ error: 'Blockchain initialization failed', details: err.message });
    }
});

// ── POST /api/elections/:ballotId/submit ────────────────────────────────────
router.post('/:ballotId/submit', authMiddleware, async (req, res) => {
    try {
        const { ballotId } = req.params;
        const { selections } = req.body;
        
        const election = await Election.findOne({ ballotId }).lean();
        if (!election) {
            return res.status(404).json({ error: 'Election not found.' });
        }

        if (!canParticipateInElection({ userRole: req.role, userFaculty: req.faculty, election })) {
            return res.status(403).json({ error: 'You are not eligible to vote in this election.' });
        }

        // Use the voter's ID from the auth token
        const voterId = req.userId; 

        // Enforce one vote per election before calling blockchain.
        const alreadyVoted = await hasUserVoted(voterId, ballotId);
        if (alreadyVoted) {
            return res.status(400).json({ error: 'You have already voted in this election.' });
        }

        if (!FABRIC_ENABLED) {
            return res.status(503).json({ error: 'Blockchain integration is required for voting and is currently disabled.' });
        }

        // Extract the selected candidate ID
        const contestId = Object.keys(selections)[0];
        const candidateId = selections[contestId][0]; 

        // FIXED: Generate the castAt timestamp so the response has it, and the blockchain gets it
        const castAt = new Date().toISOString();

        // FIXED: Send all 4 required arguments to the Hyperledger Fabric Smart Contract
        const txResult = await submitVoteTransaction(ballotId, voterId, candidateId, castAt);

        // Persist immutable receipt (unique index also prevents race-condition duplicates).
        await recordVoteReceipt(voterId, ballotId, selections, String(txResult));

        res.json({ 
            success: true, 
            transactionId: txResult, 
            message: 'Vote successfully secured on the blockchain.',
            castAt: castAt
        });

    } catch (err) {
        console.error('Failed to submit vote to blockchain:', err);
        if ((err.message && err.message.includes('already voted')) || err?.code === 11000) {
            return res.status(400).json({ error: 'You have already voted in this election.' });
        }

        if (err.isFabricUnavailable) {
            return res.status(503).json({ error: 'Blockchain is currently unavailable. Please try again shortly.' });
        }

        res.status(500).json({ error: 'Failed to process vote on the blockchain.' });
    }
});

module.exports = router;
module.exports.KNOWN_FACULTIES = KNOWN_FACULTIES;
module.exports.__testables = {
    normalizeFaculty,
    normalizeRole,
    matchesFacultyRestriction,
    passesVoterRestriction,
    canParticipateInElection,
    canViewElection,
};