# Frontend Setup Guide

## Prerequisites

You need Node.js installed. If you don't have it:

1. Download from: https://nodejs.org/ (get the LTS version)
2. Install it (this will also install npm)
3. Restart your terminal/Cursor after installation

Verify installation:
```bash
node --version
npm --version
```

---

## Step 1: Create Environment File

In the `frontend/` folder, create a file named `.env` with this content:

```env
VITE_USE_MOCKS=true
VITE_API_BASE_URL=http://localhost:8000
```

Important: `VITE_USE_MOCKS=true` lets you run without a backend.

---

## Step 2: Install Dependencies

Open terminal in the `frontend/` folder and run:

```bash
npm install
```

This downloads React, MUI, Router, Axios, etc. (takes 1-3 minutes)

---

## Step 3: Start the Development Server

```bash
npm run dev
```

You should see:
```
VITE v5.x ready in 300 ms
Local: http://localhost:5173/
```

---

## Step 4: Open in Browser

Go to: http://localhost:5173

You should see the Login page.

---

## Step 5: Test Login Credentials

### Student Login (any email/password works in mock mode):
- Email: `student@uwo.ca` (or any email)
- Password: `password` (or any password)

This will log you in as a student with SCIENCE faculty.

### Admin Login:
- Email: `admin@uwo.ca`
- Password: `admin`

---

## Step 6: Test Student Flow

After logging in as student, you'll see:

1. Student Dashboard (`/vote`)
   - Current ballots section
   - Voting receipts section
   - Click "Vote Now" on a ballot

2. Ballot Page (`/vote/:ballotId`)
   - Multiple contests (USC President, Science President, etc.)
   - Different voting types:
     - Ranked: USC President (use up/down arrows)
     - Single: Science President (radio buttons)
     - Multi: Science Councillor (checkboxes, max 6)
     - Multi: Senate – At Large (checkboxes, max 4)
   - Submit button validates required contests

3. Confirmation Page (`/confirm/:ballotId`)
   - Success message
   - Transaction ID
   - "Back to Elections" button

---

## Troubleshooting

### "npm is not recognized"
- Node.js is not installed or not in PATH
- Install Node.js from nodejs.org
- Restart terminal after installation

### "Cannot find module"
- Run `npm install` again
- Delete `node_modules` folder and `package-lock.json`, then run `npm install`

### Port already in use
- Change port in `vite.config.js` or kill the process using port 5173

### Page shows errors
- Check browser console (F12)
- Make sure `.env` file exists with `VITE_USE_MOCKS=true`

---

## What You Should See

- Clean, simple university portal design
- No "crypto" visuals
- Professional spacing and typography
- Responsive layout
- Clear instructions for each contest type
- Faculty-based filtering (Science-only contests visible if faculty = SCIENCE)

---

## Next Steps

Once you can see the interface:
- Test all contest types (single, multi, ranked)
- Verify faculty filtering works
- Check voting receipts display
- Test admin login and dashboard

If something looks off, describe what you see and we can adjust styling/layout.
