# Blockchain E-Voting Frontend

React 18 + Vite frontend for the UWO Blockchain E-Voting System.

## Tech Stack

- React 18 - UI library
- Vite - Build tool and dev server
- Material-UI (MUI) v5 - Component library
- React Router v6 - Client-side routing
- Axios - HTTP client
- Context API - Authentication state management

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCKS=false
```

- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_USE_MOCKS`: Set to `true` to use mock data (useful for frontend development without backend)

### Development

```bash
npm run dev
```

The app will start at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Mock Mode

To run the frontend without a backend, set `VITE_USE_MOCKS=true` in your `.env` file.

Mock Credentials:
- Admin: `admin@uwo.ca` / `admin`
- Student: Any email / any password

Mock mode provides realistic sample data for all endpoints, allowing frontend development to proceed independently.

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── CandidateCard.jsx
│   │   ├── StatsCard.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── ErrorAlert.jsx
│   │   └── ProtectedRoute.jsx
│   ├── pages/           # Page components
│   │   ├── LoginPage.jsx
│   │   ├── VotingPage.jsx
│   │   ├── ConfirmationPage.jsx
│   │   ├── AdminPage.jsx
│   │   └── ResultsPage.jsx
│   ├── context/         # React Context providers
│   │   └── AuthContext.jsx
│   ├── services/        # API service layer
│   │   └── api.js
│   ├── App.jsx          # Main app component with routing
│   └── main.jsx         # Entry point
├── package.json
├── vite.config.js
└── .env.example
```

## Features

- Role-based Authentication: Student and Admin roles
- Protected Routes: Automatic redirects based on authentication and role
- JWT Token Management: Stored in localStorage with automatic token attachment to requests
- Error Handling: User-friendly error messages with MUI Alerts
- Loading States: Loading spinners for async operations
- Responsive Design: Mobile-friendly layout using MUI Grid system

## API Endpoints

The frontend expects the following backend endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/elections/current` - Get current active election
- `POST /api/votes` - Submit a vote
- `GET /api/admin/stats` - Get admin statistics
- `GET /api/admin/results/:electionId` - Get election results

## User Roles

- Student: Can view and vote in elections
- Admin: Can view statistics and election results
