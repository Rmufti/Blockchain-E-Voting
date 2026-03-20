const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

// ── User Schema ──
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    studentNumber: { type: String, required: true, unique: true },
    faculty: { type: String },
    role: { type: String, enum: ["admin", "student"], required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// ── Test Users ──
const testUsers = [
  {
    email: "fjones5@uwo.ca",
    password: "password123",
    fullName: "Fred Jones",
    studentNumber: "251379712",
    faculty: "Administration",
    role: "admin",
  },
  {
    email: "jfrancis3@uwo.ca",
    password: "password456",
    fullName: "Jane Francis",
    studentNumber: "251014459",
    faculty: "Science",
    role: "student",
  },
];

// ── Seed Function ──
async function seed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("MONGODB_URI is not set. Copy .env.example to .env and fill in your connection string.");
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas");

    // Clear existing users
    await User.deleteMany({});
    console.log("Cleared existing users");

    // Hash passwords and insert
    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      await User.create({ ...user, password: hashedPassword });
      console.log(`Created ${user.role}: ${user.fullName} (${user.email})`);
    }

    console.log("\nSeed complete!");
    console.log("Admin login:   fjones5@uwo.ca / password123");
    console.log("Student login:  jfrancis3@uwo.ca / password456");
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seed();
