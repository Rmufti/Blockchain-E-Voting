const express = require("express");
const router = express.Router();
const crypto = require("crypto"); 
const authMiddleware = require("../middleware/auth");
const { castVote, getVotes } = require("../repos");

// IMPORTANT: Import your Fabric service here! 
// const { submitVoteToLedger } = require('../submitVote'); 

// Cast a vote for a candidate
router.post("/vote", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId; // Securely pulled from the auth token
        const { electionId, ranking } = req.body;

        // 1. Check if they already voted in the local database
        const existing = await getVotes({ userId, electionId });
        if (existing && existing.length > 0) {
            return res.status(400).json({ message: "Already voted" });
        }

        // 2. Generate the Anonymous Voter Hash for the Blockchain
        const voterHash = crypto
            .createHash('sha256')
            .update(userId.toString() + electionId.toString())
            .digest('hex');

        // 3. GENERATE THE TIMESTAMP ON THE SERVER
        // Creates a perfect ISO string: e.g., "2026-03-26T20:15:00.000Z"
        const castAt = new Date().toISOString(); 

        // ==========================================
        // 4. THE BLOCKCHAIN INTEGRATION POINT
        // ==========================================
        // You send the anonymous `voterHash` AND the `castAt` timestamp to Fabric here.
        // 
        // const blockchainTxId = await submitVoteToLedger(electionId, voterHash, ranking, castAt);
        // ==========================================

        const txIdToSave = req.body.blockchainTxId || "pending-tx-id";

        // 5. Save the record to your local database (The "Billboard")
        const voteId = await castVote({
            userId,      
            electionId,
            rankingJson: ranking,
            blockchainTxId: txIdToSave,
            castAt // <-- Save the timestamp to your local DB as well!
        });

        res.json({ 
            message: "Vote cast successfully", 
            voteId: voteId,
            voterHash: voterHash,
            castAt: castAt // <-- Returned so you can see it working in Postman/Frontend
        });

    } catch (error) {
        console.error("Error casting vote:", error);
        res.status(500).json({ error: "Failed to cast vote." });
    }
});

module.exports = router;