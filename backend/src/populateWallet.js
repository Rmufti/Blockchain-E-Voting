const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log("Starting wallet population...");

        // 1. Define where your backend wallet is
        const walletPath = path.resolve(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 2. Define where the test-network generated the User keys
        // This navigates up from backend/src -> backend -> E-Voting -> Code -> fabric-samples
        // Hardcoded absolute path based on your findings
        const credPath = '/Users/rameezmufti/Documents/Code/blockchain-project/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp';
        
        // 3. Read the Certificate
        const certDir = path.join(credPath, 'signcerts');
        const certFiles = fs.readdirSync(certDir);
        const certificate = fs.readFileSync(path.join(certDir, certFiles[0])).toString();

        // 4. Read the Private Key
        const keyDir = path.join(credPath, 'keystore');
        const keyFiles = fs.readdirSync(keyDir);
        const privateKey = fs.readFileSync(path.join(keyDir, keyFiles[0])).toString();

        // 5. Create the identity object
        const identity = {
            credentials: {
                certificate,
                privateKey,
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        // 6. Save it to your wallet as 'appUser'
        await wallet.put('appUser', identity);
        console.log('✅ Successfully added "appUser" identity to the wallet!');

    } catch (error) {
        console.error(`❌ Error adding to wallet: ${error}`);
        console.log('Make sure your test-network is running and the path to fabric-samples is correct.');
    }
}

main();