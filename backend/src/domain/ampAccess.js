const { BRANCHES } = require("./branchRouting");
function assertAmpBranch(req, unit) {
  if (!["admin", "manager", "technician"].includes(req.authUser?.role)) return;
  if (!BRANCHES.includes(req.activeBranch)) {
    const error = new Error("This account does not have a valid branch assignment."); error.status = 403; throw error;
  }
  if (unit && unit.serviceBranch !== req.activeBranch) {
    const error = new Error("This AC unit is not assigned to your branch."); error.status = 403; throw error;
  }
}
module.exports = { assertAmpBranch };
