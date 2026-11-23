import prisma from "../../config/prisma.js";
import Staff from "./staff.model.js";
import jwt from "jsonwebtoken";


export const updateServiceRequestStatus = async (
    requestId,
    newStatus
) => {
    const allowedStatuses = [
        "received",
        "in_progress",
        "completed",
    ];

    if (!allowedStatuses.includes(newStatus)) {
        const error = new Error("Invalid service request status");
        error.statusCode = 400;
        throw error;
    }

    const serviceRequest = await prisma.serviceRequest.findUnique({
        where: {
            id: requestId,
        },
    });

    if (!serviceRequest) {
        const error = new Error("Service request not found");
        error.statusCode = 404;
        throw error;
    }

    // Prevent requests from moving backwards
    const validTransitions = {
        received: ["in_progress"],
        in_progress: ["completed"],
        completed: [],
    };

    if (!validTransitions[serviceRequest.status].includes(newStatus)) {
        const error = new Error(
            `Cannot change request status from ${serviceRequest.status} to ${newStatus}`
        );
        error.statusCode = 400;
        throw error;
    }

    const updatedRequest = await prisma.serviceRequest.update({
        where: {
            id: requestId,
        },
        data: {
            status: newStatus,
            completedAt:
                newStatus === "completed" ? new Date() : null,
        },
    });

    return updatedRequest;
};


export const registerStaff = async (staffData) => {
    const { fullName, email, password } = staffData;

    // Check whether the email already exists
    const existingStaff = await Staff.findOne({
        email: email.toLowerCase(),
    });

    if (existingStaff) {
        const error = new Error("Email is already registered");
        error.statusCode = 409;
        throw error;
    }

    // Create the staff account
    const staff = await Staff.create({
        fullName,
        email: email.toLowerCase(),
        password,
    });

    return {
        id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        role: staff.role,
    };
};



export const loginStaff = async ({ email, password }) => {
    // Find staff account and explicitly retrieve password
    const staff = await Staff.findOne({
        email: email.toLowerCase(),
    }).select("+password");

    if (!staff) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    // Check whether the account is active
    if (!staff.isActive) {
        const error = new Error("Your account has been deactivated");
        error.statusCode = 403;
        throw error;
    }

    // Compare submitted password with stored password hash
    const isPasswordValid = await staff.comparePassword(password);

    if (!isPasswordValid) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    // Generate JWT
    const token = jwt.sign(
        {
            id: staff._id,
            role: staff.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d",
        }
    );

    return {
        staff: {
            id: staff._id,
            fullName: staff.fullName,
            email: staff.email,
            role: staff.role,
        },
        token,
    };
};