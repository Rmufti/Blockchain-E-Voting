const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function submitVote() {
    try {
        // 1. Load the wallet you just created
        const walletPath = path.resolve(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check to see if we've already enrolled the user
        const identity = await wallet.get('appUser');
        if (!identity) {
            console.log('An identity for the user "appUser" does not exist in the wallet');
            console.log('Run your setup script first!');
            return;
        }

        // 2. Load the connection profile (the map)
        // Update this path to wherever you copied connection-org1.json
        const ccpPath = path.resolve(__dirname, '..', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 3. Create a new gateway for connecting to our peer node
        const gateway = new Gateway();
        
        console.log('Connecting to the gateway...');
        await gateway.connect(ccp, {
            wallet,
            identity: 'appUser',
            discovery: { enabled: true, asLocalhost: true } // asLocalhost is crucial for testing locally!
        });

        // 4. Get the network (channel) our contract is deployed to
        // Replace 'mychannel' with your actual channel name if it's different
        const network = await gateway.getNetwork('mychannel');

        // 5. Get the smart contract from the network
        // Replace 'evoting' with whatever name you gave your chaincode when you deployed it
        const contract = network.getContract('testchaincode');

        // 6. Submit the transaction!
        // Replace 'CastVote' and the arguments with your actual smart contract function
       // 6. Execute Blockchain Transactions!

        // Step A: Initialize the Election first
        console.log('\n--> Submitting transaction: InitElection');
        await contract.submitTransaction('InitElection', 'election1', 'Western Student Council');
        console.log('✅ Election initialized successfully.');

        // Step B: Cast the Vote (Notice we pass 'Election1' as the first parameter now!)
        console.log('\n--> Submitting transaction: CastVote');
        const voteResult = await contract.submitTransaction('CastVote', 'election1', 'Rameez', '1');
        
        console.log(`✅ Vote successfully cast! Result: ${voteResult.toString()}`);
        // 7. Disconnect from the gateway
        await gateway.disconnect();

    } catch (error) {
        console.error(`❌ Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

submitVote();