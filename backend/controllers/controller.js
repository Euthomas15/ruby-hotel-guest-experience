const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/model");

async function login(req, res) {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");

    if (
      !user ||
      !["staff", "admin"].includes(user.role) ||
      !(await user.comparePassword(password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to log in right now.",
    });
  }
}

function getCurrentUser(req, res) {
  const { user } = req;

  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    },
  });
}

async function createStaff(req, res) {
  const { fullName, email, phoneNumber = "", password, role = "staff" } = req.body || {};

  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Full name, email, and password are required.",
    });
  }

  if (!["staff", "admin"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be staff or admin.",
    });
  }

  const normalizedFullName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhoneNumber = String(phoneNumber).trim();

  if (
    !normalizedFullName ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    password.length < 8
  ) {
    return res.status(400).json({
      success: false,
      message: "Full name and email are required, and password must be at least 8 characters.",
    });
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A staff account with this email already exists.",
      });
    }

    const user = await User.create({
      fullName: normalizedFullName,
      email: normalizedEmail,
      phoneNumber: normalizedPhoneNumber,
      passwordHash: await bcrypt.hash(password, 12),
      role,
    });

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A staff account with this email already exists.",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(({ message }) => message).join(", "),
      });
    }
    console.error("Create staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create the staff account right now.",
    });
  }
}

module.exports = { getCurrentUser, login, createStaff };