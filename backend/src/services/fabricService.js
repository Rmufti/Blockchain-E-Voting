// backend/src/services/fabricService.js
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const FABRIC_ENABLED = (process.env.FABRIC_ENABLED || 'true').toLowerCase() !== 'false';
const FABRIC_RETRY_COOLDOWN_MS = Number(process.env.FABRIC_RETRY_COOLDOWN_MS || 30000);

let fabricUnavailableUntil = 0;
let lastFabricWarnAt = 0;

function makeFabricUnavailableError(message) {
    const err = new Error(message);
    err.isFabricUnavailable = true;
    return err;
}

function shouldAttemptFabricConnection() {
    if (!FABRIC_ENABLED) {
        throw makeFabricUnavailableError('Fabric integration disabled (FABRIC_ENABLED=false).');
    }

    if (Date.now() < fabricUnavailableUntil) {
        throw makeFabricUnavailableError('Fabric temporarily unavailable; retry window active.');
    }
}

function markFabricUnavailable(error) {
    fabricUnavailableUntil = Date.now() + FABRIC_RETRY_COOLDOWN_MS;

    // Throttle warning noise to at most once every 10 seconds.
    if (Date.now() - lastFabricWarnAt > 10000) {
        console.warn(`Fabric unavailable. Backing off for ${FABRIC_RETRY_COOLDOWN_MS}ms. Reason: ${error.message}`);
        lastFabricWarnAt = Date.now();
    }
}

async function getContract() {
    shouldAttemptFabricConnection();

    const ccpPath = path.resolve(__dirname, '..', '..', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.resolve(__dirname, '..', '..', 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get('appUser');
    if (!identity) {
        throw new Error('appUser identity not found in wallet. Run populateWallet.js first.');
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'appUser',
        discovery: { enabled: true, asLocalhost: true },
        eventHandlerOptions: {
            strategy: null, // 🔥 disables waiting for commit events
        },
    });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('testchaincode');

    return { contract, gateway };
}

/**
 * Submit a vote to the blockchain.
 * @param {string} electionId  - The election identifier (maps to your ballotId)
 * @param {string} voterHash   - The anonymous SHA-256 hash of the user and election
 * @param {string} candidateId - The selected candidate ID
 * @param {string} castAt      - ISO Timestamp of when the vote was cast
 * @returns {string} transactionId or result string
 */
async function submitVoteTransaction(electionId, voterHash, candidateId, castAt) {
    let gateway;
    try {
        const result = await getContract();
        gateway = result.gateway;
        const contract = result.contract;

        console.log(`Submitting vote: election=${electionId}, voterHash=${voterHash}, candidate=${candidateId}, castAt=${castAt}`);

        // IMPORTANT: The arguments passed here must exactly match the order 
        // expected by your 'CastVote' function in your chaincode.
        const txResult = await contract.submitTransaction('CastVote', electionId, voterHash, candidateId, castAt);

        console.log('Vote submitted to blockchain successfully.');
        return txResult && txResult.length > 0 ? txResult.toString() : 'VoteRecorded';

    } catch (error) {
        if (!error.isFabricUnavailable) {
            markFabricUnavailable(error);
        }
        console.error('Blockchain vote submission failed:', error.message);
        throw error;
    } finally {
        if (gateway) {
            gateway.disconnect();
        }
    }
}

/**
 * Initialize an election on the blockchain (admin use).
 * @param {string} electionId
 * @param {string} title
 * @param {string} startDate
 * @param {string} endDate
 * @param {string} candidatesJson - Stringified array of candidate objects
 */
async function initElection(electionId, title, startDate, endDate, candidatesJson) {
    let gateway;
    try {
        const result = await getContract();
        gateway = result.gateway;
        const contract = result.contract;

        // Pass all the new metadata down to the blockchain
        await contract.submitTransaction('InitElection', electionId, title, startDate, endDate, candidatesJson);
        
        console.log(`Election ${electionId} initialized on blockchain.`);
        return true;
    } catch (error) {
        if (!error.isFabricUnavailable) {
            markFabricUnavailable(error);
        }
        console.error('Failed to initialize election:', error.message);
        throw error;
    } finally {
        if (gateway) gateway.disconnect();
    }
}

/**
 * Query results for an election from the blockchain.
 * @param {string} electionId
 * @returns {object} tally results
 */
async function queryResults(electionId) {
    let gateway;
    try {
        const result = await getContract();
        gateway = result.gateway;
        const contract = result.contract;

        const raw = await contract.evaluateTransaction('QueryResults', electionId);
        return JSON.parse(raw.toString());
    } catch (error) {
        if (!error.isFabricUnavailable) {
            markFabricUnavailable(error);
        }
        console.error('Failed to query results:', error.message);
        throw error;
    } finally {
        if (gateway) gateway.disconnect();
    }
}

/**
 * Fetch the details of a specific election to display to the voter.
 * @param {string} electionId
 * @returns {object} election details (candidates, status, etc.)
 */
async function getElection(electionId) {
    let gateway;
    try {
        const result = await getContract();
        gateway = result.gateway;
        const contract = result.contract;

        const raw = await contract.evaluateTransaction('GetElection', electionId);
        
        console.log(`Successfully fetched election ${electionId} from blockchain.`);
        return JSON.parse(raw.toString());
    } catch (error) {
        if (!error.isFabricUnavailable) {
            markFabricUnavailable(error);
        }
        console.error(`Failed to fetch election ${electionId}:`, error.message);
        throw error;
    } finally {
        if (gateway) gateway.disconnect();
    }
}

module.exports = {
    submitVoteTransaction,
    initElection,
    queryResults,
    getElection,
};