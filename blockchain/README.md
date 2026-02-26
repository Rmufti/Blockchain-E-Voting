# 🗳️ Hyperledger Fabric E-Voting  
### Zero to Hero Guide

This guide walks you through setting up a **local Hyperledger Fabric test network**, deploying a **Chaincode-as-a-Service (CCAAS)** voting smart contract, and **casting your first blockchain vote**.

By the end, you’ll have:
- A running Fabric network
- A deployed JavaScript voting smart contract
- A successfully recorded vote on the ledger

---

## 📋 Prerequisites

Before starting, make sure:

- You are inside the `fabric-samples/test-network` directory
- **Docker Desktop** is running
- Fabric binaries are already installed (`fabric-samples` setup completed)

---

## 🚀 Phase 1: Clean Slate & Start the Network

Whenever you want to reset everything and start fresh, run the following:

```bash
# Tear down existing containers and artifacts
./network.sh down

# Start the network, create a channel, and enable Certificate Authorities
./network.sh up createChannel -c mychannel -ca -s couchdb
```

## Phase 3: Build & Deploy the Chaincode

This single command:
Builds the Docker image
Installs chaincode on peers
Starts chaincode containers automatically

```bash
./network.sh deployCCAAS -ccn testchaincode -ccp ../asset-transfer-basic/chaincode-javascript/

```
Verify Deployment
```bash
docker ps
```
You should see containers similar to:
peer0org1_testchaincode_ccaas
peer0org2_testchaincode_ccaas



##Phase 4: Build Ballot Box
```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  -C mychannel \
  -n testchaincode \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
  -c '{"function":"InitElection","Args":["election1", "Student Council 2024"]}'
```

##Phase 5 (Test Votes and Ballots)
```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  -C mychannel \
  -n testchaincode \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
  -c '{"function":"CastVote","Args":["election1", "Student_001","Candidate_Alice"]}'
```
Output
```bash
Chaincode invoke successful. result: status:200
```

Verify Ledger
```bash
peer chaincode query \
  -C mychannel \
  -n testchaincode \
  -c '{"function":"getVote","Args":["election1", "Student_001"]}'
```



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
