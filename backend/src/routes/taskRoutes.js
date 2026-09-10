const express = require("express");
const { requireAuth, allowRoles } = require("../middleware/auth");
const {
	listTasks,
	createTask,
	updateTask,
	getTaskById,
	acceptTask,
	checkInTask,
  confirmCodCollection,
	getRegistrationContextBySerial,
	getTechnicianUnitHistoryBySerial,
	registerAmpUnit,
	updateTaskStatus,
} = require("../controllers/taskController");

const router = express.Router();
const { collectServicePayment } = require("../controllers/servicePaymentController");
const { getVisitAttempt, submitVisitAttempt, scheduleNextVisit } = require('../controllers/visitAttemptController');

router.use(requireAuth);
router.get("/", allowRoles("customer", "technician", "admin", "superadmin"), listTasks);
router.post("/", allowRoles("admin", "superadmin"), createTask);
router.get("/registration-context/:serialNumber", allowRoles("technician", "admin", "superadmin"), getRegistrationContextBySerial);
router.get("/unit-history/:serialNumber", allowRoles("technician", "admin", "superadmin"), getTechnicianUnitHistoryBySerial);
router.get("/:taskId", allowRoles("technician", "admin", "superadmin"), getTaskById);
router.patch("/:taskId/accept", allowRoles("technician"), acceptTask);
router.patch("/:taskId/check-in", allowRoles("technician"), checkInTask);
router.get('/:taskId/visit-attempt', allowRoles('technician', 'admin', 'superadmin'), getVisitAttempt);
router.patch('/:taskId/visit-attempt', allowRoles('technician'), submitVisitAttempt);
router.patch('/:taskId/next-visit', allowRoles('admin', 'superadmin'), scheduleNextVisit);
router.patch("/:taskId/cod-collection", allowRoles("technician"), confirmCodCollection);
router.patch("/:taskId/service-payment", allowRoles("technician"), collectServicePayment);
router.patch("/:taskId/amp-registration", allowRoles("technician"), registerAmpUnit);
router.patch("/:taskId", allowRoles("technician", "admin", "superadmin"), updateTask);
router.patch("/:taskId/status", allowRoles("technician", "admin", "superadmin"), updateTaskStatus);

module.exports = router;
