# Frontend Spec – Blockchain E-Voting (UWO Inspired)

## Tech requirements
- React 18 + Vite
- MUI v5
- React Router v6
- Axios
- AuthContext (Context API)
- JWT stored in localStorage
- Role-based routing: student vs admin
- Use .env for API base URL (VITE_API_BASE_URL)

## Pages
1. LoginPage
- Fields: email, password
- POST /api/auth/login
- Success: store token + role, redirect:
  - student -> /vote
  - admin -> /admin
- Errors: show MUI Alert

2. VotingPage (student only)
- GET /api/elections/current
- Show election title + candidate list as cards
- Select ONE candidate only
- POST /api/votes with encryptedVote payload (placeholder for now)
- On success -> /confirm (show transactionId)
- Errors: already voted, unauthorized, server error

3. ConfirmationPage (student only)
- Show success + transactionId
- Button: "Back to Elections" -> /vote

4. AdminPage (admin only)
- GET /api/admin/stats
- Show stats cards + simple table (placeholder)
- Link/button to Results

5. ResultsPage (admin only)
- GET /api/admin/results/:electionId
- Show final tallies in table/list

## API endpoints (frontend calls backend only)
- POST /api/auth/login
- GET /api/elections/current
- POST /api/votes
- GET /api/admin/stats
- GET /api/admin/results/:electionId

## UX + quality
- Loading spinners
- Friendly error messages
- Responsive layout
- No vote data cached in browser beyond transactionId
