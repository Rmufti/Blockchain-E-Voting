// db.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ROLE_VALUES = [
  'student',
  'candidate',
  'admin',
  'usc_admin',
  'usc_president',
  'usc_vp',
  'faculty_president',
  'councillor',
  'meeting_chair',
];

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: String,
  studentNumber: String,
  faculty: String,
  role: { type: String, enum: ROLE_VALUES, default: 'student' },
  permissions: { type: [String], default: [] },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  grantedAt: { type: Date, default: null },
  roleHistory: {
    type: [
      new mongoose.Schema(
        {
          from: { type: String, default: null },
          to: { type: String, required: true },
          by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
          reason: { type: String, default: '' },
          timestamp: { type: Date, default: Date.now },
          contextElectionId: { type: String, default: null },
        },
        { _id: false }
      ),
    ],
    default: [],
  },
  enrollment_status: { type: String, default: 'active' }
});

const User = mongoose.model('User', userSchema);

// Vote receipt schema
const voteReceiptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  electionId: { type: String, required: true },
  voteData: { type: Object, required: true },
  transactionId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Enforce one vote per user per election at the database level.
voteReceiptSchema.index({ userId: 1, electionId: 1 }, { unique: true });

const VoteReceipt = mongoose.model('VoteReceipt', voteReceiptSchema);

// Connect to MongoDB
async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI or MONGODB_URI not defined in .env');
  const dbName = process.env.MONGODB_DB_NAME || undefined;
  return mongoose.connect(uri, dbName ? { dbName } : undefined);
}

// Create user
async function createUser({ email, password, fullName, studentNumber, faculty, role }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    email,
    password: hashedPassword,
    fullName,
    studentNumber,
    faculty,
    role
  });
  await user.save();
  return user._id;
}

// Find user by email
async function findUserByEmail(email) {
  return User.findOne({ email });
}

// Verify voter eligibility
async function verifyVoterEligibility(studentNumber, electionId) {
  const user = await User.findOne({ studentNumber, enrollment_status: 'active' });
  if (!user) {
    throw new Error('Unauthorized: Active student number not found in the system.');
  }
  return user._id;
}

// Record vote receipt
async function recordVoteReceipt(userId, electionId, voteData, transactionId) {
  const receipt = new VoteReceipt({
    userId,
    electionId,
    voteData,
    transactionId
  });
  await receipt.save();
  return receipt._id;
}

async function hasUserVoted(userId, electionId) {
  const existing = await VoteReceipt.exists({ userId, electionId });
  return !!existing;
}

module.exports = {
  connectDB,
  createUser,
  findUserByEmail,
  verifyVoterEligibility,
  recordVoteReceipt,
  hasUserVoted,
  VoteReceipt,
  User
};