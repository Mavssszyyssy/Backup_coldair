const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Fixed paths to point into src/ directory
const User = require("./src/models/User");
const OtpRequest = require("./src/models/OtpRequest");
const AuditLog = require("./src/models/AuditLog");
const Order = require("./src/models/Order");
const Task = require("./src/models/Task");
const { seedDemoUsers } = require("./src/seed/seedDemoUsers");
const { seedDashboardData } = require("./src/seed/seedDashboardData");

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

    console.log("[MAINTENANCE] Truncating Order collection...");
    await Order.deleteMany({});

    console.log("[MAINTENANCE] Truncating Task collection...");
    await Task.deleteMany({});

    console.log("[MAINTENANCE] Re-seeding standard accounts...");
    await seedDemoUsers();

    console.log("[MAINTENANCE] Re-seeding dashboard data (Tasks/Orders)...");
    await seedDashboardData();

    console.log("\n========================================");
    console.log(" DATABASE RESET COMPLETE");
    console.log(" All custom data and OTPs purged.");
    console.log(" Initial seed state restored.");
    console.log("========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Database reset failed:", err);
    process.exit(1);
  }
}

resetAccounts();
