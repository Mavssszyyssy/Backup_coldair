const express = require("express");
const { requireAuth, allowRoles } = require("../middleware/auth");
const {
  createPartsRequest,
  getMyPartsRequests,
  listPartsRequests,
  updatePartsRequestStatus,
} = require("../controllers/partsRequestController");

const router = express.Router();

router.use(requireAuth);
router.post("/", allowRoles("technician"), createPartsRequest);
router.get("/me", allowRoles("technician"), getMyPartsRequests);
router.get("/", allowRoles("admin", "superadmin"), listPartsRequests);
router.patch("/:requestId/status", allowRoles("admin", "superadmin"), updatePartsRequestStatus);

module.exports = router;
