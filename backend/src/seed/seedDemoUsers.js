const bcrypt = require("bcryptjs");
const connectDb = require("../config/db");
const User = require("../models/User");

const users = [
  {
    email: "admin@example.com",
    alias: "admin.main",
    password: "admin123",
    name: "Admin User",
    name_first: "Admin",
    name_last: "User",
    phone: "09123456780",
    address: "456 Admin Street",
    role: "admin",
    assignedBranch: "Bulacan",
    activeBranch: "Bulacan",
  },
  {
    email: "superadmin@example.com",
    alias: "superadmin.main",
    password: "admin123", // Using standard demo password
    name: "Super Admin",
    name_first: "Super",
    name_last: "Admin",
    phone: "09123456799",
    address: "Global Headquarters",
    role: "superadmin",
  },
];

const seedDemoUsers = async () => {
  for (const item of users) {
    const exists = await User.findOne({ email: item.email });
    if (exists) {
      continue;
    }
    const configuredPassword = item.role === "superadmin"
      ? process.env.SEED_SUPERADMIN_PASSWORD
      : process.env.SEED_ADMIN_PASSWORD;
    if (process.env.NODE_ENV === "production" && !configuredPassword) {
      throw new Error(`Set a private seed password before creating the ${item.role} account.`);
    }
    const passwordHash = await bcrypt.hash(configuredPassword || item.password, 10);
    const { password: _demoPassword, ...account } = item;
    await User.create({ ...account, passwordHash, isFirstLogin: true });
  }
  console.log("Demo users seeded.");
};

module.exports = { seedDemoUsers };

if (require.main === module) {
  connectDb()
    .then(() => seedDemoUsers())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
