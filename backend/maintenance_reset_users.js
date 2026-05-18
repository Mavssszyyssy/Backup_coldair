const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Fixed paths to point into src/ directory
const User = require("./src/models/User");
const OtpRequest = require("./src/models/OtpRequest");
const AuditLog = require("./src/models/AuditLog");
const { seedDemoUsers } = require("./src/seed/seedDemoUsers");

async function resetAccounts() {
  try {
    console.log("[MAINTENANCE] Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully.");

    console.log("[MAINTENANCE] Truncating User collection...");
    await User.deleteMany({});

    console.log("[MAINTENANCE] Truncating OtpRequest collection...");
    await OtpRequest.deleteMany({});

    console.log("[MAINTENANCE] Truncating AuditLog collection...");
    await AuditLog.deleteMany({});

    console.log("[MAINTENANCE] Re-seeding standard accounts...");
    await seedDemoUsers();

    console.log("\n========================================");
    console.log(" DATABASE RESET COMPLETE");
    console.log(" All custom accounts and OTPs purged.");
    console.log(" Only seeded accounts remain.");
    console.log("========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Database reset failed:", err);
    process.exit(1);
  }
}

resetAccounts();
