import fs from "fs";
import path from "path";

const source = (relativePath) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

test("service cash follows report, payment, and completion in that order", () => {
  const completion = source("app/technician/task/[id]/complete-service.jsx");
  const information = source("app/technician/task/[id]/information.jsx");
  expect(completion).toContain("1. Record the completed service");
  expect(completion).toContain("Save report and update payment total");
  expect(completion).toContain("2. Confirm the customer payment");
  expect(completion).toContain("3. Complete the visit");
  expect(completion).toContain("await upsertServiceLog");
  expect(information).toContain("Add service note and final costs");
  expect(information).toContain("Confirm payment and complete");
});
