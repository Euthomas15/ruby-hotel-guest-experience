import { validateBookingInput } from "../../validators/booking.validator.js";
import { createBooking , lookupBooking} from "./bookings.service.js";
import { createServiceRequest, getBookingServiceRequests } from "./bookings.service.js";
import { validateServiceRequest } from "../../validators/service-request.validator.js";


export const createBookingController = async (req, res, next) => {
    try {
        const bookingData = {
            ...req.body,
            guests: Number(req.body.guests),
        };

        const errors = validateBookingInput(bookingData);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Booking validation failed",
                errors,
            });
        }

        const booking = await createBooking(bookingData);

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: booking,
        });
    } catch (error) {
        next(error);
    }
};


export const lookupBookingController = async (req, res, next) => {
    try {
        const { bookingReference, email } = req.body;

        if (!bookingReference || !email) {
            return res.status(400).json({
                success: false,
                message: "Booking reference and email are required",
            });
        }

        const booking = await lookupBooking({
            bookingReference,
            email,
        });

        return res.status(200).json({
            success: true,
            message: "Booking retrieved successfully",
            data: booking,
        });

    } catch (error) {
        next(error);
    }
};


export const createServiceRequestController = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        const errors = validateServiceRequest(req.body);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Service request validation failed",
                errors,
            });
        }

        const serviceRequest = await createServiceRequest(
            bookingId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Service request submitted successfully",
            data: serviceRequest,
        });

    } catch (error) {
        next(error);
    }
};



export const getBookingServiceRequestsController = async (
    req,
    res,
    next
) => {
    try {
        const { bookingId } = req.params;

        const requests = await getBookingServiceRequests(bookingId);

        return res.status(200).json({
            success: true,
            message: "Service requests retrieved successfully",
            data: requests,
        });

    } catch (error) {
        next(error);
    }
};
