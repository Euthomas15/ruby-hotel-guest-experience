const crypto = require("crypto");
const mongoose = require("mongoose");
const Booking = require("../models/booking.model");
const Room = require("../models/room.model");
const ServiceRequest = require("../models/service-request.model");
const { pool } = require("../configs/postgres");
const { parseStay, calculateQuote } = require("../services/pricing.service");
const { sendGuestEmail } = require("../services/email.service");

const serviceCategories = new Map([
  ["extra towels", "extra_towels"],
  ["extra_towels", "extra_towels"],
  ["room cleaning", "room_cleaning"],
  ["room_cleaning", "room_cleaning"],
  ["airport pickup", "airport_pickup"],
  ["airport_pickup", "airport_pickup"],
  ["food and drinks", "food_and_drinks"],
  ["food_and_drinks", "food_and_drinks"],
]);

function createReference() {
  return `RUB-${crypto.randomInt(100000, 1000000)}`;
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

async function findGuestBooking(reference, email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { error: "Booking email is required." };
  }

  const booking = await Booking.findOne({
    reference: String(reference || "").trim().toUpperCase(),
    "guest.email": normalizedEmail,
  });
  return { booking };
}

function emailDeliveryResult(result) {
  if (result.status === "not_configured") {
    return { status: result.status, message: "SMTP email delivery is not configured." };
  }
  return { status: result.status };
}

async function checkout(req, res) {
  const { guest, roomId, stay } = req.body || {};
  if (
    !guest ||
    typeof guest.fullName !== "string" ||
    typeof guest.email !== "string" ||
    typeof guest.phoneNumber !== "string" ||
    typeof roomId !== "string" ||
    !stay
  ) {
    return res.status(400).json({
      success: false,
      message: "Guest details, a room ID, and stay details are required.",
    });
  }

  const fullName = guest.fullName.trim();
  const email = normalizeEmail(guest.email);
  const phoneNumber = guest.phoneNumber.trim();
  if (!fullName || !phoneNumber || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Enter a full name, valid email address, and phone number.",
    });
  }

  const dateRange = parseStay(stay.checkIn, stay.checkOut);
  if (!dateRange) {
    return res.status(400).json({
      success: false,
      message: "Check-out must be a valid date after check-in.",
    });
  }

  const guestCount = Number(stay.guestCount);
  const roomCount = Number(stay.roomCount || 1);
  if (
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    !Number.isInteger(roomCount) ||
    roomCount < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "Guest and room counts must be positive whole numbers.",
    });
  }

  try {
    const roomFilter = mongoose.isValidObjectId(roomId)
      ? { $or: [{ slug: roomId.toLowerCase() }, { _id: roomId }], active: true }
      : { slug: roomId.toLowerCase(), active: true };
    const room = await Room.findOne(roomFilter);
    if (!room) {
      return res.status(404).json({ success: false, message: "Room type not found." });
    }
    if (guestCount > room.capacity * roomCount) {
      return res.status(400).json({
        success: false,
        message: "The selected room count does not support this many guests.",
      });
    }
    if (room.currency !== "NGN") {
      return res.status(400).json({
        success: false,
        message: "Checkout currently supports NGN room rates only.",
      });
    }
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "PostgreSQL payment storage is not configured.",
      });
    }

    const quote = calculateQuote({
      rate: room.rate,
      nights: dateRange.nights,
      roomCount,
      currency: room.currency,
    });
    if (!quote) {
      return res.status(400).json({ success: false, message: "Unable to calculate this stay." });
    }

    let booking;
    let reference;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      reference = createReference();
      try {
        booking = await Booking.create({
          reference,
          guest: { fullName, email, phoneNumber },
          room: {
            roomId: room.id,
            slug: room.slug,
            name: room.name,
            rate: room.rate,
            imageUrl: room.imageUrl,
          },
          stay: {
            checkIn: dateRange.checkIn,
            checkOut: dateRange.checkOut,
            nights: dateRange.nights,
            guestCount,
            roomCount,
          },
          subtotal: quote.subtotal,
          vatRate: quote.vatRate,
          vatAmount: quote.vatAmount,
          amount: quote.total,
          currency: quote.currency,
        });
        break;
      } catch (error) {
        if (error.code !== 11000 || attempt === 4) {
          throw error;
        }
      }
    }

    try {
      await pool.query(
        `INSERT INTO payments
          (reference, booking_reference, amount, currency, status, provider)
         VALUES ($1, $2, $3, $4, 'pending', 'paystack')`,
        [reference, reference, quote.total, quote.currency]
      );
    } catch (error) {
      await Booking.deleteOne({ _id: booking._id });
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Booking created. Complete payment to confirm it.",
      booking,
      availabilityTracked: false,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(({ message }) => message).join(", "),
      });
    }
    console.error("Checkout error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create the booking right now.",
    });
  }
}

async function getBooking(req, res) {
  const result = await findGuestBooking(req.params.reference, req.query.email);
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }
  if (!result.booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  return res.status(200).json({ success: true, booking: result.booking });
}

async function submitPreArrival(req, res) {
  const { email, arrivalTime, specialRequests = "", contactNumber } = req.body || {};
  const result = await findGuestBooking(req.params.reference, email);
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }
  if (!result.booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  if (typeof arrivalTime !== "string" || !arrivalTime.trim() ||
      typeof contactNumber !== "string" || !contactNumber.trim() ||
      typeof specialRequests !== "string" || specialRequests.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Expected arrival and contact number are required; special requests must be 1000 characters or fewer.",
    });
  }
  if (result.booking.preArrival.status === "approved") {
    return res.status(409).json({
      success: false,
      message: "Pre-arrival details can no longer be changed after approval.",
    });
  }

  const previousStatus = result.booking.preArrival.status;
  result.booking.preArrival.arrivalTime = arrivalTime.trim();
  result.booking.preArrival.specialRequests = specialRequests.trim();
  result.booking.preArrival.contactNumber = contactNumber.trim();
  result.booking.preArrival.status = "submitted";
  result.booking.preArrival.reviewedAt = null;
  result.booking.preArrival.reviewedBy = null;
  result.booking.preArrival.statusHistory.push({
    from: previousStatus,
    to: "submitted",
    actorType: "guest",
  });
  await result.booking.save();

  const notification = await sendGuestEmail({
    to: result.booking.guest.email,
    subject: `Pre-arrival details received · ${result.booking.reference}`,
    text: `Hello ${result.booking.guest.fullName},\n\nWe received your pre-arrival details for booking ${result.booking.reference}. Reception will review them before check-in.`,
  }).catch((error) => {
    console.error("Pre-arrival email failed:", error);
    return { status: "failed" };
  });

  return res.status(200).json({
    success: true,
    booking: result.booking,
    emailDelivery: emailDeliveryResult(notification),
  });
}

async function savePreference(req, res) {
  const { email, category } = req.body || {};
  const validCategories = ["quiet_stay", "explore_abuja", "fitness_wellness"];
  const result = await findGuestBooking(req.params.reference, email);
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }
  if (!result.booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: "Choose quiet_stay, explore_abuja, or fitness_wellness.",
    });
  }

  result.booking.preferences = { category, updatedAt: new Date() };
  await result.booking.save();
  return res.status(200).json({ success: true, preferences: result.booking.preferences });
}

async function getRoomAccess(req, res) {
  const result = await findGuestBooking(req.params.reference, req.query.email);
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }
  if (!result.booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }

  const approved = result.booking.roomAccess.status === "available";
  return res.status(200).json({
    success: true,
    mode: "simulation",
    realLockConnected: false,
    status: approved ? "available" : "awaiting_approval",
    message: approved
      ? "Reception approved your check-in. Collect your room key at reception."
      : "Access is available after staff approval. No room number or code is shown yet.",
  });
}

async function initializePayment(req, res) {
  const reference = String(req.params.reference || "").trim().toUpperCase();
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const callbackUrl = process.env.PAYSTACK_CALLBACK_URL;
  const result = await findGuestBooking(reference, req.body?.email);

  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }
  const booking = result.booking;
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  if (booking.paymentStatus === "verified") {
    return res.status(409).json({ success: false, message: "This booking is already paid." });
  }
  if (!secretKey || !callbackUrl || !pool) {
    return res.status(503).json({
      success: false,
      message: "Paystack, callback URL, and PostgreSQL configuration are required.",
    });
  }

  try {
    const payment = await pool.query(
      `SELECT status, amount, currency FROM payments WHERE booking_reference = $1`,
      [reference]
    );
    if (payment.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }
    if (
      Number(payment.rows[0].amount) !== booking.amount ||
      payment.rows[0].currency !== booking.currency
    ) {
      return res.status(409).json({
        success: false,
        message: "The payment record does not match the booking total.",
      });
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: booking.guest.email,
        amount: Math.round(booking.amount * 100),
        currency: booking.currency,
        reference,
        callback_url: callbackUrl,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      throw new Error(payload.message || "Paystack initialization failed.");
    }

    await pool.query(
      `UPDATE payments
       SET status = 'pending', provider_reference = $1,
           provider_payload = $2, updated_at = NOW()
       WHERE booking_reference = $3`,
      [payload.data.reference, JSON.stringify(payload.data), reference]
    );

    return res.status(200).json({
      success: true,
      authorizationUrl: payload.data.authorization_url,
      accessCode: payload.data.access_code,
      reference,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return res.status(502).json({
      success: false,
      message: "Unable to initialize payment right now.",
    });
  }
}

async function verifyPayment(req, res) {
  const reference = String(req.params.reference || req.query.reference || "")
    .trim()
    .toUpperCase();
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  let booking;
  if (req.method === "GET") {
    booking = await Booking.findOne({ reference });
  } else {
    const result = await findGuestBooking(reference, req.body?.email);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    booking = result.booking;
  }

  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  if (!secretKey || !pool) {
    return res.status(503).json({ success: false, message: "Payment configuration is missing." });
  }

  const paymentResult = await pool.query(
    `SELECT status, amount, currency FROM payments WHERE booking_reference = $1`,
    [reference]
  );
  if (paymentResult.rowCount === 0) {
    return res.status(404).json({ success: false, message: "Payment record not found." });
  }
  if (
    Number(paymentResult.rows[0].amount) !== booking.amount ||
    paymentResult.rows[0].currency !== booking.currency
  ) {
    return res.status(409).json({
      success: false,
      message: "The payment record does not match the booking total.",
    });
  }
  if (booking.paymentStatus === "verified" && paymentResult.rows[0].status === "verified") {
    return res.status(200).json({
      success: true,
      reference,
      paymentStatus: "verified",
      bookingStatus: booking.bookingStatus,
    });
  }

  let response;
  let payload;
  try {
    response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    payload = await response.json();
  } catch (error) {
    console.error("Payment verification request failed:", error);
    return res.status(502).json({
      success: false,
      message: "Unable to verify payment with Paystack right now.",
    });
  }

  if (!response.ok || !payload.status || !payload.data) {
    return res.status(502).json({
      success: false,
      message: payload.message || "Paystack could not verify this transaction.",
    });
  }

  const transaction = payload.data;
  if (transaction.status !== "success") {
    await pool.query(
      `UPDATE payments SET status = 'pending', provider_payload = $1, updated_at = NOW()
       WHERE booking_reference = $2`,
      [JSON.stringify(payload), reference]
    );
    return res.status(202).json({
      success: false,
      reference,
      paymentStatus: "verifying",
      message: "Payment is not confirmed yet. Check again shortly.",
    });
  }

  const expectedAmount = Math.round(booking.amount * 100);
  const validTransaction =
    Number(transaction.amount) === expectedAmount &&
    String(transaction.currency).toUpperCase() === booking.currency.toUpperCase() &&
    String(transaction.reference) === reference &&
    normalizeEmail(transaction.customer?.email) === booking.guest.email;

  if (!validTransaction) {
    await pool.query(
      `UPDATE payments SET status = 'failed', provider_payload = $1, updated_at = NOW()
       WHERE booking_reference = $2`,
      [JSON.stringify(payload), reference]
    );
    return res.status(409).json({
      success: false,
      message: "The verified transaction details do not match this booking.",
    });
  }

  await pool.query(
    `UPDATE payments
     SET status = 'verified', provider_reference = $1,
         provider_payload = $2, updated_at = NOW()
     WHERE booking_reference = $3`,
    [transaction.reference, JSON.stringify(payload), reference]
  );
  booking.paymentStatus = "verified";
  booking.bookingStatus = "confirmed";
  await booking.save();

  const notification = await sendGuestEmail({
    to: booking.guest.email,
    subject: `Your Ruby Hotel stay is confirmed · ${booking.reference}`,
    text: `Hello ${booking.guest.fullName},\n\nYour stay is confirmed.\n\nBooking: ${booking.reference}\nRoom: ${booking.room.name}\nDates: ${booking.stay.checkIn.toISOString().slice(0, 10)} to ${booking.stay.checkOut.toISOString().slice(0, 10)}\nGuests: ${booking.stay.guestCount}\nTotal paid: ${booking.currency} ${booking.amount.toFixed(2)}\n\nWe look forward to welcoming you.`,
  }).catch((error) => {
    console.error("Booking confirmation email failed:", error);
    return { status: "failed" };
  });

  return res.status(200).json({
    success: true,
    reference,
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
    emailDelivery: emailDeliveryResult(notification),
  });
}

async function simulatePayment(req, res) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ success: false, message: "Not found." });
  }
  if (!pool) {
    return res.status(503).json({ success: false, message: "Payment storage is not configured." });
  }

  const reference = String(req.params.reference || "").trim().toUpperCase();
  const result = await findGuestBooking(reference, req.body?.email);
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }
  const booking = result.booking;
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  const successful = req.body?.status === "success";
  const status = successful ? "verified" : "failed";

  const paymentUpdate = await pool.query(
    `UPDATE payments SET status = $1, updated_at = NOW()
     WHERE booking_reference = $2 AND amount = $3 AND currency = $4`,
    [status, reference, booking.amount, booking.currency]
  );
  if (paymentUpdate.rowCount === 0) {
    return res.status(409).json({
      success: false,
      message: "Payment record does not match the booking.",
    });
  }
  booking.paymentStatus = status;
  booking.bookingStatus = successful ? "confirmed" : "pending";
  await booking.save();
  return res.status(200).json({
    success: successful,
    reference,
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
  });
}

async function createServiceRequest(req, res) {
  const { email, category, details = "" } = req.body || {};
  const result = await findGuestBooking(req.params.reference, email);
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }
  if (!result.booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  const normalizedCategory =
    typeof category === "string" ? serviceCategories.get(category.trim().toLowerCase()) : null;
  if (!normalizedCategory || typeof details !== "string" || details.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Choose a listed service and provide an optional note of at most 1000 characters.",
    });
  }

  const serviceRequest = await ServiceRequest.create({
    booking: result.booking.id,
    bookingReference: result.booking.reference,
    category: normalizedCategory,
    details: details.trim(),
    statusHistory: [{ to: "requested", actorType: "guest" }],
  });
  return res.status(201).json({ success: true, serviceRequest });
}

async function listGuestServiceRequests(req, res) {
  const result = await findGuestBooking(req.params.reference, req.query.email);
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }
  if (!result.booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  const requests = await ServiceRequest.find({ booking: result.booking.id })
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, requests });
}

async function listStaffServiceRequests(req, res) {
  const query = {};
  if (req.query.status) {
    query.status = req.query.status;
  }
  const requests = await ServiceRequest.find(query)
    .populate("booking", "reference guest.fullName guest.email room.name")
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, requests });
}

async function updateServiceStatus(req, res) {
  const allowedStatuses = ["requested", "in_progress", "completed", "cancelled"];
  const { status } = req.body || {};
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid service request status." });
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid service request ID." });
  }
  const serviceRequest = await ServiceRequest.findById(req.params.id);
  if (!serviceRequest) {
    return res.status(404).json({ success: false, message: "Service request not found." });
  }
  if (status === serviceRequest.status) {
    await serviceRequest.populate("booking", "reference guest.fullName guest.email");
    return res.status(200).json({ success: true, serviceRequest });
  }
  const nextStatuses = {
    requested: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  if (!nextStatuses[serviceRequest.status].includes(status)) {
    return res.status(409).json({
      success: false,
      message: `A ${serviceRequest.status} request cannot transition to ${status}.`,
    });
  }

  serviceRequest.statusHistory.push({
    from: serviceRequest.status,
    to: status,
    actorType: req.user.role,
    actorId: req.user.id,
  });
  serviceRequest.status = status;
  serviceRequest.assignedTo = req.user.id;
  await serviceRequest.save();
  await serviceRequest.populate("booking", "reference guest.fullName guest.email");
  const notification = await sendGuestEmail({
    to: serviceRequest.booking.guest.email,
    subject: `Service request update · ${serviceRequest.booking.reference}`,
    text: `Hello ${serviceRequest.booking.guest.fullName},\n\nYour ${serviceRequest.category.replaceAll("_", " ")} request is now ${status.replaceAll("_", " ")}.`,
  }).catch((error) => {
    console.error("Service status email failed:", error);
    return { status: "failed" };
  });

  return res.status(200).json({
    success: true,
    serviceRequest,
    emailDelivery: emailDeliveryResult(notification),
  });
}

async function getStaffDashboard(req, res) {
  const [serviceCounts, pendingPreArrival, totalBookings] = await Promise.all([
    ServiceRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Booking.countDocuments({ "preArrival.status": "submitted" }),
    Booking.countDocuments(),
  ]);
  const counts = Object.fromEntries(serviceCounts.map(({ _id, count }) => [_id, count]));
  return res.status(200).json({
    success: true,
    serviceRequests: {
      received: counts.requested || 0,
      inProgress: counts.in_progress || 0,
      completed: counts.completed || 0,
      cancelled: counts.cancelled || 0,
    },
    preArrivalPending: pendingPreArrival,
    totalBookings,
  });
}

async function listPreArrivalReviews(req, res) {
  const bookings = await Booking.find({ "preArrival.status": "submitted" })
    .select("reference guest.fullName guest.email room.name stay.checkIn stay.checkOut preArrival")
    .sort({ updatedAt: 1 });
  return res.status(200).json({ success: true, bookings });
}

async function reviewPreArrival(req, res) {
  const reference = String(req.params.reference || "").trim().toUpperCase();
  const { status } = req.body || {};
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Review status must be approved or rejected.",
    });
  }

  const booking = await Booking.findOne({ reference });
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  if (booking.preArrival.status !== "submitted") {
    return res.status(409).json({
      success: false,
      message: "Only submitted pre-arrival details can be reviewed.",
    });
  }
  if (status === "approved" && booking.paymentStatus !== "verified") {
    return res.status(409).json({
      success: false,
      message: "Check-in cannot be approved before payment is verified.",
    });
  }

  booking.preArrival.status = status;
  booking.preArrival.reviewedAt = new Date();
  booking.preArrival.reviewedBy = req.user.id;
  booking.preArrival.statusHistory.push({
    from: "submitted",
    to: status,
    actorType: req.user.role,
    actorId: req.user.id,
  });
  booking.roomAccess.status = status === "approved" ? "available" : "awaiting_approval";
  booking.roomAccess.approvedAt = status === "approved" ? new Date() : null;
  await booking.save();

  const notification = await sendGuestEmail({
    to: booking.guest.email,
    subject: `Pre-arrival review · ${booking.reference}`,
    text: status === "approved"
      ? `Hello ${booking.guest.fullName},\n\nReception approved your check-in details for booking ${booking.reference}. Please collect your room key at reception.`
      : `Hello ${booking.guest.fullName},\n\nReception could not approve your pre-arrival details for booking ${booking.reference}. Please contact the hotel.`,
  }).catch((error) => {
    console.error("Pre-arrival review email failed:", error);
    return { status: "failed" };
  });

  return res.status(200).json({
    success: true,
    booking: {
      reference: booking.reference,
      preArrival: booking.preArrival,
      roomAccess: booking.roomAccess,
    },
    emailDelivery: emailDeliveryResult(notification),
  });
}

module.exports = {
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
};
