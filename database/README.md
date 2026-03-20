# Database — Blockchain E-Voting

## Overview

This project uses **MongoDB Atlas** (cloud-hosted) for user authentication data.
The database stores sign-in information only — all election data, ballots, and vote
tallies live on the blockchain.

## What's stored in MongoDB

| Field         | Type   | Description                    |
|---------------|--------|--------------------------------|
| email         | String | User email (unique)            |
| password      | String | Bcrypt-hashed password         |
| fullName      | String | User's full name               |
| studentNumber | String | Student number (unique)        |
| faculty       | String | Faculty name                   |
| role          | String | `admin` or `student`           |
| createdAt     | Date   | Auto-generated timestamp       |
| updatedAt     | Date   | Auto-generated timestamp       |

## Setup

1. Copy the env template and fill in the Atlas connection string:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your actual `MONGODB_URI`.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the seed script to populate test users:
   ```bash
   npm run seed
   ```

## Test Accounts

| Role    | Email              | Password    |
|---------|--------------------|-------------|
| Admin   | fjones5@uwo.ca     | password123 |
| Student | jfrancis3@uwo.ca   | password456 |

## Connection

The backend connects using the `MONGODB_URI` environment variable.
Connection string format:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/evoting?retryWrites=true&w=majority
```

## Notes

- Passwords are hashed with bcrypt (12 salt rounds)
- The old PostgreSQL schema has been removed — MongoDB is the sole database
- Election-related data is handled by the blockchain layer, not this database
