const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("live data cleanup is dry-run by default and requires an exact database and confirmation", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "cleanup-live-data.js"), "utf8");
  assert.match(source, /args\.has\("--apply"\)/);
  assert.match(source, /LIVE_DATA_CLEANUP_EXPECTED_DATABASE/);
  assert.match(source, /CLEAN_APPROVED_PRESENTATION_DATA/);
  assert.match(source, /withTransaction/);
  assert.match(source, /--allow-nontransactional/);
  assert.match(source, /guarded idempotent operations/);
  assert.match(source, /nonRetailProductsToArchive/);
  assert.match(source, /availableUnit\.status/);
  assert.match(source, /Dry run only\. No records were changed\./);
});
