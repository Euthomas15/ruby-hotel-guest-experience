import { initializePayment } from "./payments.service.js";
import { verifyPayment} from "./payments.service.js";
import { createHmac, timingSafeEqual } from "crypto";

export const initializePaymentController = async (req, res, next) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required",
            });
        }

        const payment = await initializePayment(bookingId);

        return res.status(200).json({
            success: true,
            message: "Payment initialized successfully",
            data: payment,
        });
    } catch (error) {
        next(error);
    }
};


export const verifyPaymentController = async (req, res, next) => {
    try {
        const { providerReference } = req.params;

        if (!providerReference) {
            return res.status(400).json({
                success: false,
                message: "Payment reference is required",
            });
        }

        const result = await verifyPayment(providerReference);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};


export const paystackWebhookController = async (req, res) => {
    try {
        const signature = req.headers["x-paystack-signature"];

        if (!signature || !Buffer.isBuffer(req.body)) {
            return res.status(400).json({
                success: false,
                message: "Invalid webhook request",
            });
        }

        const expectedSignature = createHmac(
            "sha512",
            process.env.PAYSTACK_SECRET_KEY
        )
            .update(req.body)
            .digest("hex");

        const receivedBuffer = Buffer.from(signature, "hex");
        const expectedBuffer = Buffer.from(expectedSignature, "hex");

        if (
            receivedBuffer.length !== expectedBuffer.length ||
            !timingSafeEqual(receivedBuffer, expectedBuffer)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid webhook signature",
            });
        }

        const event = JSON.parse(req.body.toString("utf8"));

        if (event.event !== "charge.success") {
            return res.status(200).json({
                success: true,
                message: "Webhook event received",
            });
        }

        const reference = event.data?.reference;

        if (!reference) {
            return res.status(400).json({
                success: false,
                message: "Payment reference is missing",
            });
        }

        const result = await verifyPayment(reference);

        return res.status(200).json({
            success: true,
            message: result.message,
        });

    } catch (error) {
        console.error("Paystack webhook error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Webhook processing failed",
        });
    }
};