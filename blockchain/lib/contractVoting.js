'use strict';

const { Contract } = require('fabric-contract-api');

class contractVoting extends Contract {

    // Initialize the election
    async InitElection(ctx, electionID, electionName) {
        const election = {
            docType: 'election',
            ID: electionID,
            Name: electionName,
            Status: 'OPEN'  // FIX 1: Changed 'Open' to 'OPEN' to match test
        };
        await ctx.stub.putState(electionID, Buffer.from(JSON.stringify(election)));
        return JSON.stringify(election);
    }

    // Voting (Core Logic)
    // FIX 2: Renamed 'CastVotes' to 'CastVote' (Singular) to match test
    async CastVote(ctx, electionID, studentID, candidateName) {
        
        // Check Election Status
        const electionBytes = await ctx.stub.getState(electionID);
        
        if (!electionBytes || electionBytes.length === 0) {
            throw new Error(`Election ${electionID} does not exist`);
        }

        const election = JSON.parse(electionBytes.toString());
        
        // FIX 3: Check for 'OPEN' (Uppercase)
        if (election.Status !== 'OPEN') {
            throw new Error(`Election ${electionID} is closed`);
        }

        // Check for Double Voting
        const voteKey = ctx.stub.createCompositeKey('vote', [electionID, studentID]);
        const existingVote = await ctx.stub.getState(voteKey);

        if (existingVote && existingVote.length > 0) {
            throw new Error(`FRAUD ALERT: ${studentID} has already voted`);
        }

        // Create Vote Object
        const vote = {
            docType: 'vote',
            electionID: electionID,
            studentID: studentID,
            candidate: candidateName,
        };

        // Save to Ledger
        await ctx.stub.putState(voteKey, Buffer.from(JSON.stringify(vote)));

        return JSON.stringify(vote);
    }

    // Getter Method
    async getVote(ctx, electionID, studentID) {
        const voteKey = ctx.stub.createCompositeKey('vote', [electionID, studentID]);
        const voteBytes = await ctx.stub.getState(voteKey);

        if (!voteBytes || voteBytes.length === 0) {
            throw new Error(`Student ${studentID} has not voted yet`);
        }
        return voteBytes.toString();
    }

    // Tally Votes
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
            
            const candidate = record.candidate;
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