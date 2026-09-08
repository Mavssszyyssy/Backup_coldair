const express = require("express");

const { requireAuth, allowRoles } = require("../middleware/auth");
const { getMaintenanceRecommendation, generateAmpReport } = require("../controllers/aiController");

const router = express.Router();

router.post(
  "/maintenance-recommendation",
  requireAuth,
  allowRoles("customer", "technician", "manager", "owner", "admin", "superadmin"),
  getMaintenanceRecommendation,
);
router.post(
  "/amp-report",
  requireAuth,
  allowRoles("customer", "technician", "manager", "owner", "admin", "superadmin"),
  generateAmpReport,
);

module.exports = router;
