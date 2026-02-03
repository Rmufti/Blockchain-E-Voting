# Blockchain-E-Voting

##Organizations (MSPs)

Org1: UWO-SystemMSP (Platform & Election Admin)
- Role: The dual-purpose organization acting as both the System Architect and the Election Commission.
- Operations: * Manages the blockchain network infrastructure (Orderers and Peers).
- Defines and manages elections (Create Ballots, Register Candidates).
- Controls the lifecycle of the smart contracts.

Org2: UWO-RegistrarMSP (Identity Registrar)
- Role: The trusted "Source of Truth" for student and faculty identities.
- Operations: * Registers Students and Faculty members.
- Verifies student credentials (e.g., verifying that Rameez is an active student).
- Assigns attributes like faculty and role to user certificates for access control.

👤 User Roles

SystemAdmin (Org1): Full infrastructure control. Can add new peer nodes or update channel configurations.

ElectionAdmin (Org1): Can create new elections (e.g., USC Presidential Election) and define which faculty is eligible to vote.

RegistrarAdmin (Org2): Authorized to onboard new students and faculty members into the system.

Voter (Org2): Students and Faculty members. They can cast votes in elections they are eligible for and view current standings.

Specialized Group Member (Org2): Users with specific faculty attributes (e.g., "Science") who can participate in restricted council votes.

📑 Smart Contract Functions
1. UserContract (Identity & Registration)
- RegisterUser(ctx, userId, name, email, faculty, role): Called only by Org2 (Registrar). This function saves the official student details to the ledger.
- GetUser(ctx, userId): Allows any authorized user to check if a specific ID is registered in the system.
- GetAllStudentsByFaculty(ctx, faculty): A helper function to filter and view students belonging to a specific department.

2. TokenContract (The "Digital Ballot")
- IssueBallot(ctx, userId, electionId): Called by Org1 (ElectionAdmin) once an election starts.
- Logic: Generates a unique, one-time ballotToken mapped to that user and election.
- IsBallotValid(ctx, ballotToken): A critical security check to ensure a token is authentic and has not been "spent" (burned).

3. ElectionContract (The Voting Logic)
- CreateElection(ctx, electionId, title, groupRestriction): Restricted to Org1 (ElectionAdmin).
- Key Feature: Sets the "Eligibility Filter." For example, if set to "Science," the contract will enforce that only users with the Science faculty attribute can cast a vote.
- CastVote(ctx, electionId, candidateName, ballotToken):

Spent Token Logic:

- Validates that the ballotToken exists and is linked to the correct electionId.
- Identity Check: Verifies the voter matches the groupRestriction (using the ctx.clientIdentity library to read the user's certificate).
- Audit Trail: Records that the user has voted: putState(userId + electionId, "VOTED").
- Tally: Increments the candidate's vote count: CandidateA = CandidateA + 1.
- Burn Logic: Instantly destroys the token: deleteState(ballotToken) to prevent double-voting.
- GetTotalVotes(ctx, electionId): Fetches the real-time tally for a specific election.
- CloseElection(ctx, electionId): Formally ends the voting period, preventing any further transactions.
