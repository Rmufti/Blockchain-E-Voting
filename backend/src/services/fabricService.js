const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function getContract() {
    const ccpPath = path.resolve(__dirname, '..', '..', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    const walletPath = path.resolve(__dirname, '..', '..', 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gateway = new Gateway();
    
    // Connects to the Gateway (Removed the duplicate block!)
    await gateway.connect(ccp, {
    wallet,
    identity: 'appUser', 
    // CHANGE THIS: Set enabled to false
    discovery: { enabled: false, asLocalhost: true } 
    });

    const network = await gateway.getNetwork('mychannel');
    
    // ⚠️ UPDATE THIS LINE: Change this to 'basic', 'evoting', or whatever you deployed it as!
    const contract = network.getContract('testchaincode');

    return { contract, gateway };
}

// Notice we added 'electionId' to the function parameters here!
async function submitVoteTransaction(electionId, voterId, candidateId) {
    const { contract, gateway } = await getContract();

 try {
        console.log(`Submitting vote for ${voterId}...`);
        
        const result = await contract.submitTransaction('CastVote', electionId, voterId, candidateId);
        
        console.log('✅ Vote successfully submitted to the ledger.');
        
        // Change this part to handle an empty result safely
        return result ? result.toString() : "Success"; 

    } catch (error) {
        console.error(`Failed to submit vote transaction: ${error}`);
        throw error; 

    } finally {
        if (gateway) {
            gateway.disconnect();
            console.log('Gateway disconnected.');
        }
    }
}

// Alias for getContract to return just the contract
async function getFabricContract() {
    const { contract } = await getContract();
    return contract;
}

module.exports = {
    submitVoteTransaction,
    getFabricContract
};