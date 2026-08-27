const express = require("express");
const { requireAuthNoBranch, allowRoles } = require("../middleware/auth");
const {
  createContactMessage,
  listContactMessages,
  updateContactMessage,
} = require("../controllers/contactMessageController");

const router = express.Router();

router.use(requireAuthNoBranch);
router.post("/", allowRoles("customer"), createContactMessage);
router.get("/", allowRoles("admin", "superadmin"), listContactMessages);
router.patch("/:id", allowRoles("admin", "superadmin"), updateContactMessage);

module.exports = router;
