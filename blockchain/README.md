#How to Start
Hyperledger Fabric E-Voting: Zero to Hero Guide
This guide covers how to bring up a local test network, deploy your custom Chaincode-as-a-Service (CCAAS), and cast your first vote on the blockchain.

Prerequisites:

You must be inside the fabric-samples/test-network directory in your terminal.

Docker Desktop must be running.

Phase 1: Clean Slate & Start Network
Whenever you want to start over, run these commands to delete the old network and start a fresh one with a channel named mychannel.

Bash
# 1. Tear down any running containers and artifacts
./network.sh down

# 2. Start the network, create a channel, and add Certificate Authorities
./network.sh up createChannel -c mychannel -ca
Phase 2: The Smart Contract Code
Before deploying, ensure your code files are correct. Use your code editor to paste these contents into the specified files.

1. The Logic (lib/assetTransfer.js)
Path: ../asset-transfer-basic/chaincode-javascript/lib/assetTransfer.js

JavaScript
/*
 * Copyright IBM Corp. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class VotingContract extends Contract {

    // Initialize the ledger with a sample election
    async InitLedger(ctx) {
        const election = {
            ID: 'election1',
            Name: 'UWO Student Council',
            IsOpen: true
        };
        await ctx.stub.putState(election.ID, Buffer.from(JSON.stringify(election)));
        console.info(`Election ${election.ID} initialized`);
    }

    // Cast a Vote (Simple Version - No Timestamp to avoid consensus errors)
    async CastVotes(ctx, studentID, candidateName) {
        const vote = {
            docType: 'vote', 
            studentID: studentID, 
            candidate: candidateName
        };

        // Save the vote to the ledger
        await ctx.stub.putState(studentID, Buffer.from(JSON.stringify(vote)));
        return JSON.stringify(vote);
    }

    // Read a Vote or Asset
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }
}

module.exports = VotingContract;
2. The Entry Point (index.js)
Path: ../asset-transfer-basic/chaincode-javascript/index.js Note: This must remain simple for the CCAAS server to work.

JavaScript
'use strict';

const assetTransfer = require('./lib/assetTransfer');

module.exports.AssetTransfer = assetTransfer;
module.exports.contracts = [assetTransfer];
3. The Dependency File (package.json)
Path: ../asset-transfer-basic/chaincode-javascript/package.json Note: Ensure the "start" script uses fabric-chaincode-node server.

JSON
{
  "name": "asset-transfer-basic",
  "version": "1.0.0",
  "description": "Voting Smart Contract",
  "main": "index.js",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "start": "fabric-chaincode-node server --chaincode-address=0.0.0.0:9999 --chaincode-id=$CHAINCODE_ID"
  },
  "dependencies": {
    "fabric-contract-api": "^2.5.0",
    "fabric-shim": "^2.5.0",
    "json-stringify-deterministic": "^1.0.0",
    "sort-keys-recursive": "^2.1.0"
  }
}
4. The Docker Image (Dockerfile)
Path: ../asset-transfer-basic/chaincode-javascript/Dockerfile Note: Must use Node 18 or 20.

Dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 9999
CMD ["npm", "start"]
Phase 3: Build & Deploy
This single command builds your Docker image, installs the chaincode on the peers, and (crucially) starts the chaincode containers automatically.

Bash
./network.sh deployCCAAS -ccn testchaincode -ccp ../asset-transfer-basic/chaincode-javascript/
Verification: After this finishes, verify the containers are running:

Bash
docker ps
You should see peer0org1_testchaincode_ccaas and peer0org2... in the list.

Phase 4: Interaction ("Log In")
To interact with the network, you must tell your terminal who you are (Org1 Admin). You must run this block every time you open a new terminal.

Bash
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
Phase 5: Cast Your Vote
Now you can invoke the smart contract function.

1. Cast a Vote

Bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n testchaincode --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"CastVotes","Args":["Student_001", "Candidate_Alice"]}'
Expected Output: Chaincode invoke successful. result: status:200

2. Verify the Vote (Read from Ledger)

Bash
peer chaincode query -C mychannel -n testchaincode -c '{"function":"ReadAsset","Args":["Student_001"]}'
Expected Output: {"docType":"vote","studentID":"Student_001","candidate":"Candidate_Alice"}

Phase 6: Troubleshooting (Manual Mode)
If docker ps does not show your chaincode containers, the automatic start failed. You must start them manually using the specific Chaincode ID.

Find the ID: Look at the last lines of the ./network.sh deployCCAAS output for Package ID.

Start Manually:

Bash
docker run --rm -d --name peer0org1_testchaincode_ccaas \
  --network fabric_test \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CHAINCODE_ID=PASTE_PACKAGE_ID_HERE \
  testchaincode_ccaas_image:latest

# Blockchain Understanding (LOGIC)

Place Hyperledger Fabric (or other) blockchain code here: smart contracts, chaincode, and any SDK/gateway code that the backend uses to submit transactions.

Merge points:
- Backend should invoke this layer for vote recording, ballot issuance, and ledger reads. No direct frontend–blockchain connection.
- Contract roles and functions are described in the root `README.md` (UserContract, TokenContract, ElectionContract). Align chaincode with those interfaces so the backend can call them consistently.
- If you use connection profiles or crypto material, keep paths or config in env (e.g. `FABRIC_*`) so the backend can load them without hardcoding repo paths.

Suggested structure:
- `chaincode/` – smart contracts (e.g. Go/Node)
- `gateway/` or `sdk/` – client code used by the backend to talk to the network
- `config/` – connection profiles, channel config (optional, or in backend)

After merging, document in this README how to deploy and run the network (e.g. scripts, Docker Compose) and which env vars the backend needs.
