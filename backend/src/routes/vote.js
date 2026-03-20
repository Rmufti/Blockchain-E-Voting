const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { castVote, getVotes } = require("../repos");

// Cast a vote for a candidate
router.post("/vote", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { electionId,ranking, blockchainTxId } = req.body;
    const existing = await getVotes({userId, electionId});
    if (existing){
        return res.status(400).json({message: "Already voted"});

    }

    const voteId = await castVote({
        userId,
        electionId,
        rankingJson: ranking,
        blockchainTxId
    });
    res.json({ voteId });
    });
module.exports = router;