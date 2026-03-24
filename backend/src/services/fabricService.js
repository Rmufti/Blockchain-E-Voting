// backend/src/services/fabricService.js
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function getContract() {
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
        discovery: { enabled: false, asLocalhost: true }
    });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('testchaincode');

    return { contract, gateway };
}

/**
 * Submit a vote to the blockchain.
 * @param {string} electionId - The election identifier (maps to your ballotId)
 * @param {string} voterId    - The student number or unique voter ID
 * @param {string} candidateId - The selected candidate ID
 * @returns {string} transactionId or result string
 */
async function submitVoteTransaction(electionId, voterId, candidateId) {
    let gateway;
    try {
        const result = await getContract();
        gateway = result.gateway;
        const contract = result.contract;

        console.log(`Submitting vote: election=${electionId}, voter=${voterId}, candidate=${candidateId}`);

        const txResult = await contract.submitTransaction('CastVote', electionId, voterId, candidateId);

        console.log('Vote submitted to blockchain successfully.');
        return txResult && txResult.length > 0 ? txResult.toString() : 'VoteRecorded';

    } catch (error) {
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
 * @param {string} electionName
 */
async function initElection(electionId, electionName) {
    let gateway;
    try {
        const result = await getContract();
        gateway = result.gateway;
        const contract = result.contract;

        await contract.submitTransaction('InitElection', electionId, electionName);
        console.log(`Election ${electionId} initialized on blockchain.`);
        return true;
    } catch (error) {
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
        console.error('Failed to query results:', error.message);
        throw error;
    } finally {
        if (gateway) gateway.disconnect();
    }
}

module.exports = {
    submitVoteTransaction,
    initElection,
    queryResults,
};