"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const response_1 = require("../utils/response");
const contacts_service_1 = require("../services/contacts.service");
const contact_schema_1 = require("../middleware/validate/contact.schema");
const rate_limit_1 = require("../middleware/rate-limit");
const sanitize_1 = require("../utils/sanitize");
const router = (0, express_1.Router)();
const contactService = new contacts_service_1.ContactService();
router.use(authenticate_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const contacts = await contactService.listContacts(req.user.id);
        const masked = contacts.map((c) => ({
            ...c.toJSON(),
            phone_number_encrypted: (0, sanitize_1.maskPhone)(c.phone_number_encrypted),
        }));
        (0, response_1.sendSuccess)(res, masked);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', (0, validate_1.validate)(contact_schema_1.createContactSchema), async (req, res, next) => {
    try {
        const contact = await contactService.addContact(req.user.id, req.body);
        (0, response_1.sendCreated)(res, {
            id: contact.id,
            name: contact.name,
            phone_number_encrypted: (0, sanitize_1.maskPhone)(contact.phone_number_encrypted),
            relationship: contact.relationship,
            verified: contact.verified,
            created_at: contact.created_at,
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/verify-otp', rate_limit_1.otpLimiter, (0, validate_1.validate)(contact_schema_1.verifyOtpSchema), async (req, res, next) => {
    try {
        const result = await contactService.verifyOtp(req.user.id, req.params.id, req.body.otp);
        (0, response_1.sendSuccess)(res, result);
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const contact = await contactService.getContact(req.user.id, req.params.id);
        const data = contact.toJSON();
        data.phone_number_encrypted = (0, sanitize_1.maskPhone)(data.phone_number_encrypted);
        (0, response_1.sendSuccess)(res, data);
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        await contactService.deleteContact(req.user.id, req.params.id);
        (0, response_1.sendNoContent)(res);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
