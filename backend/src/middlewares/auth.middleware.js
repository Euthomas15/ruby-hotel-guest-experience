import jwt from "jsonwebtoken";
import Staff from "../modules/staffs/staff.model.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required",
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const staff = await Staff.findById(decoded.id);

        if (!staff || !staff.isActive) {
            return res.status(401).json({
                success: false,
                message: "Staff account is invalid or deactivated",
            });
        }

        req.staff = staff;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token",
        });
    }
};


export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.staff || !roles.includes(req.staff.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action",
            });
        }

        next();
    };
};