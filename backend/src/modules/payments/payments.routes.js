import express from "express";
import { initializePaymentController,verifyPaymentController,paystackWebhookController } from "./payments.controller.js";

const router = express.Router();

router.post("/paystack/initialize", initializePaymentController);
router.post("/paystack/initialize", initializePaymentController);
router.get("/:providerReference/verify", verifyPaymentController);
router.post("/paystack/webhook", paystackWebhookController);

export default router;