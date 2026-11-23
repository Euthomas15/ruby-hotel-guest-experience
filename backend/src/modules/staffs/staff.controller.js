import { updateServiceRequestStatus } from "./staff.service.js";
import { loginStaff, registerStaff } from "./staff.service.js";
import { validateStaffRegistration, validateStaffLogin } from "../../validators/staff.validator.js";


export const registerStaffController = async (req, res, next) => {
    try {
        const staffData = req.body;

        const errors = validateStaffRegistration(staffData);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Staff registration validation failed",
                errors,
            });
        }

        const staff = await registerStaff(staffData);

        return res.status(201).json({
            success: true,
            message: "Staff account created successfully",
            data: staff,
        });

    } catch (error) {
        next(error);
    }
};


export const loginStaffController = async (req, res, next) => {
    try {
        const credentials = req.body;

        const errors = validateStaffLogin(credentials);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Login validation failed",
                errors,
            });
        }

        const result = await loginStaff(credentials);

        return res.status(200).json({
            success: true,
            message: "Staff login successful",
            data: result,
        });

    } catch (error) {
        next(error);
    }
};



export const updateServiceRequestStatusController = async (
    req,
    res,
    next
) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Request status is required",
            });
        }

        const updatedRequest = await updateServiceRequestStatus(
            requestId,
            status
        );

        return res.status(200).json({
            success: true,
            message: "Service request status updated successfully",
            data: updatedRequest,
        });

    } catch (error) {
        next(error);
    }
};