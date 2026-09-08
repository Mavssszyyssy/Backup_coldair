const express = require("express");
const { requireAuth, allowRoles } = require("../middleware/auth");
const { listWarranty, listWarrantyClaims, createWarrantyClaim, reviewWarrantyClaim } = require("../controllers/warrantyController");

const router = express.Router();
router.use(requireAuth);
router.get("/claims", allowRoles("admin", "superadmin"), listWarrantyClaims);
router.get("/units/:unitId", allowRoles("customer", "technician", "admin", "superadmin"), listWarranty);
router.post("/units/:unitId/claims", allowRoles("customer"), createWarrantyClaim);
router.patch("/units/:unitId/claims/:claimId", allowRoles("admin", "superadmin"), reviewWarrantyClaim);

module.exports = router;
