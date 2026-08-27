const test = require("node:test");
const assert = require("node:assert/strict");
const env = require("../src/config/env");
const { callStructuredAmpAnalysis, validateAmpInsight } = require("../src/services/openAiAmpService");

test("AMP uses the deterministic fallback when no provider key exists", async () => {
  const originalKey = env.openAiApiKey;
  env.openAiApiKey = "";
  const result = await callStructuredAmpAnalysis({ recommendation: {} });
  env.openAiApiKey = originalKey;
  assert.equal(result.provider, "system-fallback");
  assert.equal(result.insight, null);
});

test("validated AI output cannot replace authoritative calculations", () => {
  const deterministic = {
    bestServicedBy: "2027-05-11T00:00:00.000Z",
    recommendedService: "regular_cleaning",
    recommendationBasis: "Recorded maintenance interval.",
    capacityAssessment: { status: "suitable" },
    commonComponents: [{ component: "Filter" }],
  };
  const result = validateAmpInsight({
    best_serviced_by: "2099-01-01",
    recommended_service: "deep_cleaning",
    recommendation_summary: "Concise explanation.",
    capacity_assessment: "insufficient",
    technician_preparation: ["Filter", "Invented compressor"],
  }, deterministic);
  assert.equal(result.best_serviced_by, "2027-05-11");
  assert.equal(result.recommended_service, "regular_cleaning");
  assert.equal(result.capacity_assessment, "suitable");
  assert.deepEqual(result.technician_preparation, ["Filter"]);
});
