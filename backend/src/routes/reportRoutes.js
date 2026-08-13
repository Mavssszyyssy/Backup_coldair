const express = require("express");
const { requireAuth, allowRoles } = require("../middleware/auth");
const { getSalesReport } = require("../controllers/reportController");

const router = express.Router();

router.get("/sales", requireAuth, allowRoles("admin", "superadmin"), getSalesReport);

module.exports = router;

