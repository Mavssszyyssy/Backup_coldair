const mongoose = require("mongoose");
const env = require("./env");

const buildMongoUri = () => {
  const directHosts = String(env.mongoDirectHosts || "").trim();
  if (!directHosts || !String(env.mongoUri || "").startsWith("mongodb+srv://")) {
    return env.mongoUri;
  }

  const source = new URL(env.mongoUri);
  const options = new URLSearchParams(source.search);
  options.set("tls", "true");
  if (env.mongoReplicaSet) options.set("replicaSet", env.mongoReplicaSet);
  if (!options.has("authSource")) options.set("authSource", "admin");

  const credentials = source.username
    ? `${source.username}${source.password ? `:${source.password}` : ""}@`
    : "";
  return `mongodb://${credentials}${directHosts}/?${options.toString()}`;
};

const displayMongoTarget = (uri) => {
  try {
    return new URL(uri).host;
  } catch {
    return "configured MongoDB instance";
  }
};

const connectDb = async () => {
  const mongoUri = buildMongoUri();
  try {
    await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${displayMongoTarget(mongoUri)}`);
  } catch (error) {
    console.error(`Failed to connect to MongoDB at ${displayMongoTarget(mongoUri)}`);
    console.error("Start MongoDB or set MONGODB_URI in backend/.env to a reachable database.");
    throw error;
  }
};

module.exports = connectDb;
