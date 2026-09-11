const express = require("express");
const { requireAuth, allowRoles } = require("../middleware/auth");
const { getSalesReport, getInventoryReport, getAuditLogs } = require("../controllers/reportController");

const router = express.Router();

router.get("/sales", requireAuth, allowRoles("admin", "superadmin"), getSalesReport);
router.get("/inventory", requireAuth, allowRoles("admin", "superadmin"), getInventoryReport);
router.get("/audit-logs", requireAuth, allowRoles("admin", "superadmin"), getAuditLogs);

module.exports = router;

