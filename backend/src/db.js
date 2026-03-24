// db.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: String,
  studentNumber: String,
  faculty: String,
  role: { type: String, default: 'student' },
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

const VoteReceipt = mongoose.model('VoteReceipt', voteReceiptSchema);

// Connect to MongoDB
async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI or MONGODB_URI not defined in .env');

  return mongoose.connect(uri);
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

module.exports = {
  connectDB,
  createUser,
  findUserByEmail,
  verifyVoterEligibility,
  recordVoteReceipt,
  User
};