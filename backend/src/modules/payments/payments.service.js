import prisma from "../../config/prisma.js";
import { randomUUID } from "crypto";

export const initializePayment = async (bookingId) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    });

    if (!booking) {
        const error = new Error("Booking not found");
        error.statusCode = 404;
        throw error;
    }

    if (booking.status !== "pending_payment") {
        const error = new Error("This booking is not awaiting payment");
        error.statusCode = 400;
        throw error;
    }

    if (!booking.expiresAt || booking.expiresAt <= new Date()) {
        const error = new Error("This booking has expired");
        error.statusCode = 400;
        throw error;
    }

    // Check whether an existing pending payment can be reused.
    const existingPayment = await prisma.payment.findFirst({
        where: {
            bookingId: booking.id,
            status: "pending",
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    if (existingPayment?.authorizationUrl) {
        return {
            paymentId: existingPayment.id,
            bookingReference: booking.bookingReference,
            paymentReference: existingPayment.providerReference,
            authorizationUrl: existingPayment.authorizationUrl,
        };
    }

    // Don't create another attempt if an earlier attempt
    // exists but its initialization result is unknown.
    if (existingPayment) {
        const error = new Error(
            "An existing payment attempt needs to be checked before retrying"
        );
        error.statusCode = 409;
        throw error;
    }

    const reference = `RUBY-PAY-${randomUUID()}`;

    const payment = await prisma.payment.create({
        data: {
            bookingId: booking.id,
            provider: "paystack",
            providerReference: reference,
            amount: booking.totalAmount,
            currency: booking.currency,
            status: "pending",
        },
    });

    let response;

    try {
        response = await fetch(
            "https://api.paystack.co/transaction/initialize",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: booking.guestEmail,
                    amount: booking.totalAmount,
                    reference,
                    currency: booking.currency,
                    callback_url: "http://localhost:3000/payment/callback",
                }),
            }
        );
    } catch (error) {
        // Keep the payment pending because we don't know
        // whether Paystack received the initialization request.
        const networkError = new Error(
            "Unable to reach Paystack. Check the payment reference before retrying."
        );
        networkError.statusCode = 502;
        throw networkError;
    }

    const result = await response.json();

    if (!response.ok || !result.status) {
        await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "failed" },
        });

        const error = new Error(
            result.message || "Unable to initialize payment"
        );
        error.statusCode = 502;
        throw error;
    }

    const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
            authorizationUrl: result.data.authorization_url,
        },
    });

    return {
        paymentId: updatedPayment.id,
        bookingReference: booking.bookingReference,
        paymentReference: reference,
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
    };
};
    



export const verifyPayment = async (providerReference) => {
    // Find the payment in our database
    const payment = await prisma.payment.findUnique({
        where: {
            providerReference,
        },
        include: {
            booking: true,
        },
    });

    if (!payment) {
        throw new Error("Payment record not found");
    }

    // Prevent unnecessary reprocessing
    if (payment.status === "verified") {
        return {
            payment,
            booking: payment.booking,
            message: "Payment has already been verified",
        };
    }

    // Verify transaction with Paystack
    const response = await fetch(
        `https://api.paystack.co/transaction/verify/${providerReference}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        }
    );

    const result = await response.json();

    if (!response.ok || !result.status) {
        throw new Error(result.message || "Payment verification failed");
    }

    const transaction = result.data;

    // Check transaction reference
    if (transaction.reference !== providerReference) {
        throw new Error("Payment reference mismatch");
    }

    // Check payment amount
    if (transaction.amount !== payment.amount) {
        throw new Error("Payment amount mismatch");
    }

    // Check currency
    if (transaction.currency !== payment.currency) {
        throw new Error("Payment currency mismatch");
    }

    // Check transaction status
    if (transaction.status !== "success") {
        await prisma.payment.update({
            where: {
                id: payment.id,
            },
            data: {
                status: "failed",
            },
        });

        return {
            payment: {
                ...payment,
                status: "failed",
            },
            booking: payment.booking,
            message: "Payment was not successful",
        };
    }

    // Update payment and booking together
    const updatedRecords = await prisma.$transaction(
    async (tx) => {
        // Get the latest payment and booking information.
        const currentPayment = await tx.payment.findUnique({
            where: { id: payment.id },
            include: { booking: true },
        });

        if (!currentPayment) {
            throw new Error("Payment record not found");
        }

        // Avoid processing an already verified payment again.
        if (currentPayment.status === "verified") {
            return {
                payment: currentPayment,
                booking: currentPayment.booking,
            };
        }

        // Record the successful Paystack payment.
        await tx.payment.update({
            where: { id: payment.id },
            data: {
                status: "verified",
                paidAt: transaction.paid_at
                    ? new Date(transaction.paid_at)
                    : new Date(),
            },
        });

        // Confirm only if the booking is still pending and has not expired.
        await tx.booking.updateMany({
            where: {
                id: payment.bookingId,
                status: "pending_payment",
                expiresAt: {
                    gt: new Date(),
                },
            },
            data: {
                status: "confirmed",
            },
        });

        // Retrieve the final records.
        const updatedPayment = await tx.payment.findUnique({
            where: { id: payment.id },
        });

        const updatedBooking = await tx.booking.findUnique({
            where: { id: payment.bookingId },
        });

        return {
            payment: updatedPayment,
            booking: updatedBooking,
        };
    },
    {
        isolationLevel: "Serializable",
    }
);

const bookingConfirmed =
    updatedRecords.booking.status === "confirmed";

return {
    ...updatedRecords,
    message: bookingConfirmed
        ? "Payment verified and booking confirmed successfully"
        : "Payment was successful, but the booking has expired or been cancelled. Manual resolution is required.",
};
};