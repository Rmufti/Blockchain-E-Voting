// backend/src/models/Election.js
const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
});

const contestSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    instructionText: { type: String, default: '' },
    ruleType: {
        type: String,
        enum: ['single', 'multi', 'ranked'],
        required: true,
    },
    required: { type: Boolean, default: true },
    maxSelections: { type: Number, default: null },
    // null = everyone can vote; 'SCIENCE', 'ARTS', etc. = faculty-restricted
    restrictionFaculty: { type: String, default: null },
    candidates: [candidateSchema],
});

const electionSchema = new mongoose.Schema(
    {
        ballotId: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        // 'presidential' | 'faculty' — drives default access rules
        electionType: {
            type: String,
            enum: ['presidential', 'faculty'],
            required: true,
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ['upcoming', 'open', 'closed'],
            default: 'upcoming',
        },
        // If set, only voters whose faculty matches can see this ballot at all.
        // Presidential elections leave this null (everyone eligible).
        restrictedToFaculty: { type: String, default: null },
        contests: [contestSchema],
        // Track whether InitElection has been called on-chain
        blockchainInitialized: { type: Boolean, default: false },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Election', electionSchema);
