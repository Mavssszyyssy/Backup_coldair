const express = require("express");
const { requireAuthNoBranch, allowRoles } = require("../middleware/auth");
const { getRecordedPartsPreparation } = require("../controllers/predictionController");

const router = express.Router();

router.use(requireAuthNoBranch);

router.get(
  "/parts",
  allowRoles("technician", "manager", "owner", "admin", "superadmin"),
  getRecordedPartsPreparation,
);

module.exports = router;
