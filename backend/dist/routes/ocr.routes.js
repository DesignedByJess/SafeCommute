"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const response_1 = require("../utils/response");
const ocr_service_1 = require("../services/ocr.service");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
router.post('/scan-plate', async (req, res, next) => {
    try {
        const { image } = req.body;
        if (!image || typeof image !== 'string') {
            return next(new errors_1.AppError('Image data is required', 400, 'MISSING_IMAGE'));
        }
        const result = await (0, ocr_service_1.detectLicensePlate)(image);
        (0, response_1.sendSuccess)(res, result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
