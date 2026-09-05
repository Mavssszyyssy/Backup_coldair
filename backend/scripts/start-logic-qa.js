// Start the application against a separate, explicitly named QA database.
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const qaDatabase = process.env.LOGIC_QA_DATABASE || "coldair_logic_20260905_e2e";
if (!/^coldair_logic_\d{8}_e2e$/.test(qaDatabase)) throw new Error("Use a separately named coldair_logic_YYYYMMDD_e2e database.");
const liveUri = String(process.env.MONGODB_URI || "");
if (!/^mongodb(?:\+srv)?:\/\//.test(liveUri)) throw new Error("A configured MongoDB connection is needed.");
const slash = liveUri.indexOf("/", liveUri.indexOf("://") + 3);
const base = slash >= 0 ? liveUri.slice(0, slash) : liveUri.split("?")[0];
const query = liveUri.includes("?") ? `?${liveUri.split("?")[1]}` : "";
process.env.MONGODB_URI = `${base}/${qaDatabase}${query}`;
process.env.NODE_ENV = "development";
process.env.PORT = "5002";
process.env.HOST = "127.0.0.1";
process.env.OPENAI_API_KEY = "";
process.env.RESEND_API_KEY = "";
process.env.SMTP_HOST = "";
process.env.INFOBIP_API_KEY = "";
process.env.SEED_ADMIN_PASSWORD = "admin123";
process.env.SEED_SUPERADMIN_PASSWORD = "admin123";
process.env.SEED_TECHNICIAN_PASSWORD = "tech.123";
process.env.PAYMONGO_MODE = "test";
const mongoose = require("mongoose");
const connectDb = require("../src/config/db");
const { seedDemoUsers } = require("../src/seed/seedDemoUsers");
const env = require("../src/config/env");
if (env.paymongoSecretKey && !env.paymongoSecretKey.startsWith("sk_test_")) throw new Error("QA refuses live payment credentials.");
async function main() {
  await connectDb();
  if (mongoose.connection.name !== qaDatabase) throw new Error("QA database identity mismatch.");
  await seedDemoUsers();
  const app = require("../src/app");
  app.listen(5002, "127.0.0.1", () => console.log(`Isolated QA API ready on http://127.0.0.1:5002/api (${qaDatabase})`));
}
main().catch((error) => { console.error(error.message); process.exit(1); });
