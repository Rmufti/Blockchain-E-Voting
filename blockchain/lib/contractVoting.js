'use strict';

const { Contract } = require('fabric-contract-api');

class contractVoting extends Contract {

    constructor() {
        super('evoting');
    }

    // Initialize the election (Now accepts 5 parameters from the backend)
    async InitElection(ctx, electionID, title, startDate, endDate, candidatesJson) {
        
        // Parse the stringified candidates array back into a real JSON array
        let candidates = [];
        try {
            if (candidatesJson) {
                candidates = JSON.parse(candidatesJson);
            }
        } catch (err) {
            throw new Error(`Failed to parse candidates JSON: ${err.message}`);
        }

        const election = {
            docType: 'election',
            ID: electionID,
            Name: title,
            Status: 'OPEN',
            startDate: startDate,
            endDate: endDate,
            candidates: candidates // Saved to the ledger for easy querying later!
        };
        
        await ctx.stub.putState(electionID, Buffer.from(JSON.stringify(election)));
        console.log(`*** ELECTION CREATED WITH DATA: ${title} ***`); 
        return JSON.stringify(election);
    }

    // Fetch Election Details for the Frontend
    async GetElection(ctx, electionID) {
        const electionBytes = await ctx.stub.getState(electionID);
        
        if (!electionBytes || electionBytes.length === 0) {
            throw new Error(`Election ${electionID} does not exist`);
        }
        
        return electionBytes.toString();
    }

    // Voting (Core Logic - Upgraded for Anonymity and Timestamps)
    async CastVote(ctx, electionID, voterHash, candidateID, castAt) {
        
        // Check Election Status
        const electionBytes = await ctx.stub.getState(electionID);
        
        if (!electionBytes || electionBytes.length === 0) {
            throw new Error(`Election ${electionID} does not exist`);
        }

        const election = JSON.parse(electionBytes.toString());
        
        if (election.Status !== 'OPEN') {
            throw new Error(`Election ${electionID} is closed`);
        }

        // Check for Double Voting using the secure hash instead of studentID
        const voteKey = ctx.stub.createCompositeKey('vote', [electionID, voterHash]);
        const existingVote = await ctx.stub.getState(voteKey);

        if (existingVote && existingVote.length > 0) {
            throw new Error(`FRAUD ALERT: This anonymous hash has already voted in this election`);
        }

        // Create the highly secure, data-rich Vote Object
        const vote = {
            docType: 'vote',
            electionID: electionID,
            voterHash: voterHash, // Identity hidden!
            candidateID: candidateID,
            castAt: castAt        // Timestamp recorded!
        };

        // Save to Ledger
        await ctx.stub.putState(voteKey, Buffer.from(JSON.stringify(vote)));

        return JSON.stringify(vote);
    }

    // Getter Method (Updated to look up by hash)
    async getVote(ctx, electionID, voterHash) {
        const voteKey = ctx.stub.createCompositeKey('vote', [electionID, voterHash]);
        const voteBytes = await ctx.stub.getState(voteKey);

        if (!voteBytes || voteBytes.length === 0) {
            throw new Error(`Vote not found for this hash`);
        }
        return voteBytes.toString();
    }

    // Tally Votes (Updated to read candidateID)
    async QueryResults(ctx, electionID) {
        const queryString = {
            selector: {
                docType: 'vote',
                electionID: electionID
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = {};

        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            const record = JSON.parse(strValue);
            
            // Look up the ID instead of a hardcoded name
            const candidate = record.candidateID;
            if (results[candidate]) {
                results[candidate]++;
            } else {
                results[candidate] = 1;
            }
            
            result = await iterator.next();
        }
        return JSON.stringify(results);
    }
}

module.exports = contractVoting;