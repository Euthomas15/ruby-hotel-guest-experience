import express from "express";

import {
    loginStaffController,
} from "./staff.controller.js";

import {
    updateServiceRequestStatusController,
} from "./staff.controller.js";

import {
    authMiddleware,
    authorizeRoles,
} from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Staff login
router.post("/login", loginStaffController);

// Protected staff operations
router.patch(
    "/requests/:requestId/status",
    authMiddleware,
    authorizeRoles("admin", "receptionist", "staff"),
    updateServiceRequestStatusController
);

export default router;