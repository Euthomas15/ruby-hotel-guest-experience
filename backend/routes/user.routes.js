const express = require("express");
const { getCurrentUser, login, createStaff } = require("../controllers/controller");
const requireAuth = require("../middleware/auth.middleware");
const { requireRole } = requireAuth;

const router = express.Router();

router.post("/login", login);
router.get("/me", requireAuth, getCurrentUser);
router.post("/staff", requireAuth, requireRole("admin"), createStaff);

module.exports = router;