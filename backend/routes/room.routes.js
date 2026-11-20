const express = require("express");
const requireAuth = require("../middleware/auth.middleware");
const { requireRole } = requireAuth;
const {
  listRooms,
  getRoom,
  createRoom,
  updateRoom,
} = require("../controllers/room.controller");

const router = express.Router();

router.get("/rooms", listRooms);
router.get("/rooms/:id", getRoom);
router.post("/rooms", requireAuth, requireRole("admin"), createRoom);
router.patch("/rooms/:id", requireAuth, requireRole("admin"), updateRoom);

module.exports = router;
