const express = require("express");
const requireAuth = require("../middleware/auth.middleware");
const { requireRole } = requireAuth;
const {
  checkout,
  getBooking,
  submitPreArrival,
  savePreference,
  getRoomAccess,
  initializePayment,
  verifyPayment,
  simulatePayment,
  createServiceRequest,
  listGuestServiceRequests,
  listStaffServiceRequests,
  updateServiceStatus,
  getStaffDashboard,
  listPreArrivalReviews,
  reviewPreArrival,
} = require("../controllers/booking.controller");

const router = express.Router();
const requireStaff = [requireAuth, requireRole("staff", "admin")];

router.post("/checkout", checkout);
router.get("/payments/paystack/callback", verifyPayment);
router.get("/staff/dashboard", ...requireStaff, getStaffDashboard);
router.get("/staff/pre-arrivals", ...requireStaff, listPreArrivalReviews);
router.patch(
  "/staff/bookings/:reference/pre-arrival",
  ...requireStaff,
  reviewPreArrival
);
router.get("/staff/service-requests", ...requireStaff, listStaffServiceRequests);
router.patch(
  "/staff/service-requests/:id/status",
  ...requireStaff,
  updateServiceStatus
);

router.get("/service-requests/list", ...requireStaff, listStaffServiceRequests);
router.patch(
  "/service-requests/:id/status",
  ...requireStaff,
  updateServiceStatus
);

router.post("/:reference/payments/paystack/initialize", initializePayment);
router.post("/:reference/payments/paystack/verify", verifyPayment);
router.post("/:reference/payments/simulate", simulatePayment);

router.get("/:reference/service-requests", listGuestServiceRequests);
router.post("/:reference/service-requests", createServiceRequest);
router.patch("/:reference/pre-arrival", submitPreArrival);
router.patch("/:reference/preferences", savePreference);
router.get("/:reference/room-access", getRoomAccess);
router.get("/:reference", getBooking);

module.exports = router;
