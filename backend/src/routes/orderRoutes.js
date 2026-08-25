const express = require("express");
const { requireAuth, allowRoles } = require("../middleware/auth");
const {
  createOrder,
  listMyOrders,
  getMyOrderById,
  getMyOrderSummary,
  approveOrder,
  listOrdersForAdmin,
  getOrderByIdForAdmin,
  processOrder,
  recoverOrder,
  updateRefundReview,
  requestCustomerCancellation,
  handlePaymongoWebhook,
  handlePaymongoReturn,
  retryPaymongoCheckout,
  verifyPaymongoCheckout,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/paymongo/webhook", handlePaymongoWebhook);
router.get("/:orderId/paymongo/return", handlePaymongoReturn);
router.use(requireAuth);
router.post("/", allowRoles("customer"), createOrder);
router.get("/", allowRoles("admin", "superadmin"), listOrdersForAdmin);
router.patch("/:orderId/approve", allowRoles("admin", "superadmin"), approveOrder);
router.patch("/:orderId/process", allowRoles("admin", "superadmin"), processOrder);
router.patch("/:orderId/recovery", allowRoles("admin", "superadmin"), recoverOrder);
router.patch("/:orderId/refund-review", allowRoles("admin", "superadmin"), updateRefundReview);
router.post("/:orderId/paymongo/checkout", allowRoles("customer"), retryPaymongoCheckout);
router.post("/:orderId/paymongo/verify", allowRoles("customer", "admin", "superadmin"), verifyPaymongoCheckout);
router.get("/me", allowRoles("customer"), listMyOrders);
router.get("/me/summary", allowRoles("customer"), getMyOrderSummary);
router.patch("/me/:orderId/cancel-request", allowRoles("customer"), requestCustomerCancellation);
router.get("/me/:orderId", allowRoles("customer"), getMyOrderById);
router.get("/:orderId", allowRoles("admin", "superadmin"), getOrderByIdForAdmin);

module.exports = router;
