const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDirectMongoUri } = require("../src/config/db");

test("Atlas direct-host fallback preserves the configured database name", () => {
  const result = buildDirectMongoUri({
    mongoUri: "mongodb+srv://user:password@example.mongodb.net/aeropulse_qa?retryWrites=true&w=majority",
    directHosts: "host-a.example.net:27017,host-b.example.net:27017",
    replicaSet: "atlas-example-shard-0",
  });

  assert.match(result, /^mongodb:\/\/user:password@host-a\.example\.net:27017,host-b\.example\.net:27017\/aeropulse_qa\?/);
  assert.match(result, /replicaSet=atlas-example-shard-0/);
  assert.match(result, /authSource=admin/);
});

test("direct-host fallback keeps the default path when no database is configured", () => {
  const result = buildDirectMongoUri({
    mongoUri: "mongodb+srv://user:password@example.mongodb.net/?retryWrites=true",
    directHosts: "host-a.example.net:27017",
  });

  assert.match(result, /^mongodb:\/\/user:password@host-a\.example\.net:27017\/\?/);
});
