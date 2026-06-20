"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
router.get('/me', (req, res) => {
    (0, response_1.sendSuccess)(res, { user: req.user });
});
exports.default = router;
