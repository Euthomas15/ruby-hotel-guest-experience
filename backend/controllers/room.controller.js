const mongoose = require("mongoose");
const Room = require("../models/room.model");
const { parseStay, calculateQuote } = require("../services/pricing.service");

function findRoomFilter(id) {
  return mongoose.isValidObjectId(id)
    ? { $or: [{ _id: id }, { slug: id.toLowerCase() }], active: true }
    : { slug: id.toLowerCase(), active: true };
}

async function listRooms(req, res) {
  const { checkIn, checkOut, guests = 1 } = req.query;
  const guestCount = Number(guests);

  if ((checkIn || checkOut) && !parseStay(checkIn, checkOut)) {
    return res.status(400).json({
      success: false,
      message: "Check-out must be after check-in.",
    });
  }
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    return res.status(400).json({
      success: false,
      message: "Guest count must be a positive whole number.",
    });
  }

  const query = {
    active: true,
    capacity: { $gte: guestCount },
  };
  const rooms = await Room.find(query).sort({ rate: 1 });

  return res.status(200).json({
    success: true,
    availabilityTracked: false,
    rooms: rooms.map((room) => ({
      ...room.toObject(),
      availability: "not_tracked",
    })),
  });
}

async function getRoom(req, res) {
  const room = await Room.findOne(findRoomFilter(req.params.id));
  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found." });
  }
  const result = { ...room.toObject(), availability: "not_tracked" };
  if (req.query.checkIn || req.query.checkOut) {
    const stay = parseStay(req.query.checkIn, req.query.checkOut);
    const roomCount = Number(req.query.roomCount || 1);
    if (!stay) {
      return res.status(400).json({
        success: false,
        message: "Provide valid check-in and check-out dates.",
      });
    }

    const quote = calculateQuote({
      rate: room.rate,
      nights: stay.nights,
      roomCount,
      currency: room.currency,
    });
    if (!quote) {
      return res.status(400).json({
        success: false,
        message: "Room count must be a positive whole number.",
      });
    }
    result.quote = quote;
  }
  return res.status(200).json({ success: true, room: result });
}

async function createRoom(req, res) {
  const { slug, name, description, rate, currency, capacity, imageUrl, amenities } =
    req.body || {};

  if (
    typeof slug !== "string" ||
    typeof name !== "string" ||
    typeof description !== "string" ||
    !Number.isFinite(Number(rate)) ||
    !Number.isInteger(Number(capacity))
  ) {
    return res.status(400).json({
      success: false,
      message: "Slug, name, description, rate, and capacity are required.",
    });
  }

  try {
    const room = await Room.create({
      slug: slug.trim().toLowerCase(),
      name: name.trim(),
      description: description.trim(),
      rate: Number(rate),
      currency: currency || "NGN",
      capacity: Number(capacity),
      imageUrl: typeof imageUrl === "string" ? imageUrl : "",
      amenities: Array.isArray(amenities) ? amenities : [],
    });

    return res.status(201).json({ success: true, room });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A room with this slug already exists.",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(({ message }) => message).join(", "),
      });
    }
    throw error;
  }
}

async function updateRoom(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid room ID." });
  }
  const allowedFields = ["name", "description", "rate", "currency", "capacity", "imageUrl", "amenities", "active"];
  const updates = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key]) => allowedFields.includes(key))
  );
  if (!Object.keys(updates).length) {
    return res.status(400).json({ success: false, message: "No editable room fields provided." });
  }
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found." });
    }
    return res.status(200).json({ success: true, room });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(({ message }) => message).join(", "),
      });
    }
    throw error;
  }
}

module.exports = { listRooms, getRoom, createRoom, updateRoom };
