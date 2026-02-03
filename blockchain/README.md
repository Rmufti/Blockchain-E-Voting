# Blockchain

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
