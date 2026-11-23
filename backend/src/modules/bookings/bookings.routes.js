import express from "express";
import { createBookingController , lookupBookingController, createServiceRequestController,getBookingServiceRequestsController} from "./bookings.controller.js";
import { guestBookingMiddleware } from "../../middlewares/guest-booking.middleware.js";


const router = express.Router();

router.post("/", createBookingController);
router.post("/lookup", lookupBookingController);
router.post( "/:bookingId/requests",  guestBookingMiddleware, createServiceRequestController);
router.get("/:bookingId/requests", guestBookingMiddleware, getBookingServiceRequestsController);

export default router;