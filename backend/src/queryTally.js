const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function queryTally() {
    try {
        // 1. Load the wallet
        const walletPath = path.resolve(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const identity = await wallet.get('appUser');
        if (!identity) {
            console.log('An identity for the user "appUser" does not exist in the wallet');
            return;
        }

        // 2. Load the connection profile
        const ccpPath = path.resolve(__dirname, '..', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 3. Create a new gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'appUser',
            discovery: { enabled: true, asLocalhost: true }
        });

        // 4. Get the network and contract
        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('testchaincode');

        // 5. Query the ledger!
        // Notice we use evaluateTransaction instead of submitTransaction
        console.log('\n--> Evaluating transaction: QueryResults for Election1');
        const result = await contract.evaluateTransaction('QueryResults', 'election1');

        // 6. Parse and display the result
        const tally = JSON.parse(result.toString());
        console.log('\n✅ Voting Tally Retrieved:');
        
        // This will print the results in a nice table format in your terminal
        console.table(tally); 

        // 7. Disconnect
        await gateway.disconnect();

    } catch (error) {
        console.error(`❌ Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

queryTally();