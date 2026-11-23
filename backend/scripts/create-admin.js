import "dotenv/config";
import mongoose from "mongoose";
import Staff from "../src/modules/staffs/staff.model.js";

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);

        console.log("Connected to MongoDB");

        const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

        if (!ADMIN_NAME || ! ADMIN_EMAIL ||  !ADMIN_PASSWORD) {
            throw new Error("Admin credentials are missing from .env");
        }

        if (ADMIN_PASSWORD.length < 8) {
            throw new Error("Admin password must contain at least 8 characters");
        }

        const existingAdmin = await Staff.findOne({
            email: ADMIN_EMAIL.toLowerCase(),
            role: "admin",
        });

        if (existingAdmin) {
            console.log("An admin account already exists");
            return;
        }

        const admin = await Staff.create({
            fullName: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            role: "admin",
        });

        console.log("Admin account created successfully!");
        console.log({
            id: admin._id,
            fullName: admin.fullName,
            email: admin.email,
            role: admin.role,
        });

    } catch (error) {
        console.error("Admin creation failed:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();