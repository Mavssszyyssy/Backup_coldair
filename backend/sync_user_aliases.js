const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./src/models/User");

async function syncUserAliases() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully.");

    // Find all users with missing or empty alias
    const users = await User.find({
      $or: [
        { alias: { $exists: false } },
        { alias: null },
        { alias: "" }
      ]
    });

    console.log(`Found ${users.length} users requiring alias synchronization.`);

    let updatedCount = 0;
    let collisionCount = 0;

    for (const user of users) {
      let baseAlias = user.email.split("@")[0].toLowerCase().trim();
      let finalAlias = baseAlias;
      let counter = 1;

      // Ensure uniqueness
      while (true) {
        const existing = await User.findOne({
            $or: [{ alias: finalAlias }, { username: finalAlias }],
            _id: { $ne: user._id }
        });

        if (!existing) break;

        collisionCount++;
        finalAlias = `${baseAlias}${counter}`;
        counter++;
      }

      user.alias = finalAlias;
      await user.save();
      updatedCount++;
      console.log(`Synced: ${user.email} -> ${finalAlias}`);
    }

    console.log("\n========================================");
    console.log(" IDENTITY SYNCHRONIZATION COMPLETE");
    console.log(` TOTAL USERS UPDATED: ${updatedCount}`);
    console.log(` COLLISIONS RESOLVED: ${collisionCount}`);
    console.log("========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Synchronization failed:", err);
    process.exit(1);
  }
}

syncUserAliases();
