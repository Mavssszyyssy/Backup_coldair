const express = require("express");
const { runDailyAmpMaintenance } = require("../controllers/cronController");

const router = express.Router();
router.get("/amp-maintenance", runDailyAmpMaintenance);
module.exports = router;
