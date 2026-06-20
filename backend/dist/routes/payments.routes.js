"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const response_1 = require("../utils/response");
const payment_service_1 = require("../services/payment.service");
const payment_schema_1 = require("../middleware/validate/payment.schema");
const router = (0, express_1.Router)();
const paymentService = new payment_service_1.PaymentService();
router.post('/initiate', authenticate_1.authenticate, (0, validate_1.validate)(payment_schema_1.initiatePaymentSchema), async (req, res, next) => {
    try {
        const result = await paymentService.initializePayment(req.user.id, req.user.email || '', req.body.plan);
        (0, response_1.sendSuccess)(res, result);
    }
    catch (err) {
        next(err);
    }
});
router.post('/verify', authenticate_1.authenticate, (0, validate_1.validate)(payment_schema_1.verifyPaymentSchema), async (req, res, next) => {
    try {
        const result = await paymentService.verifyPayment(req.body.transaction_id, req.body.tx_ref);
        (0, response_1.sendSuccess)(res, result);
    }
    catch (err) {
        next(err);
    }
});
router.post('/webhook', async (req, res) => {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH || '';
    const signature = req.headers['verif-hash'];
    if (!signature || signature !== secretHash) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }
    try {
        await paymentService.handleWebhook(req.body);
    }
    catch {
        /* Log webhook processing error but always return 200 */
    }
    res.status(200).json({ success: true, data: { received: true } });
});
exports.default = router;
