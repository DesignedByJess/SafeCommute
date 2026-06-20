"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const response_1 = require("../utils/response");
const errors_1 = require("../utils/errors");
const rate_limit_1 = require("../middleware/rate-limit");
const audit_service_1 = require("../services/audit.service");
const sanitize_1 = require("../utils/sanitize");
const router = (0, express_1.Router)();
router.get('/:share_token', rate_limit_1.shareLinkLimiter, async (req, res, next) => {
    try {
        const trip = await models_1.Trip.findOne({
            where: { share_token: req.params.share_token },
            attributes: [
                'id', 'share_token', 'destination_address', 'destination_lat', 'destination_lng',
                'contact_name', 'status', 'started_at', 'expires_at', 'share_link_expires_at',
                'share_link_revoked', 'vehicle_plate_encrypted',
            ],
        });
        if (!trip)
            throw new errors_1.NotFoundError('Trip');
        if (trip.share_link_revoked) {
            throw new errors_1.AppError('This share link has been revoked', 410, 'SHARE_LINK_REVOKED');
        }
        if (trip.share_link_expires_at && new Date() > trip.share_link_expires_at) {
            throw new errors_1.ShareLinkExpiredError();
        }
        await (0, audit_service_1.auditLog)(null, 'share_link_accessed', { shareToken: req.params.share_token });
        (0, response_1.sendSuccess)(res, {
            id: trip.id,
            destination_address: trip.destination_address,
            destination_lat: trip.destination_lat,
            destination_lng: trip.destination_lng,
            contact_name: trip.contact_name,
            status: trip.status,
            started_at: trip.started_at,
            expires_at: trip.expires_at,
            vehicle_plate: (0, sanitize_1.maskPlate)(trip.vehicle_plate_encrypted),
        });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:share_token/locations', rate_limit_1.shareLinkLimiter, async (req, res, next) => {
    try {
        const trip = await models_1.Trip.findOne({
            where: { share_token: req.params.share_token },
            attributes: ['id', 'share_link_expires_at', 'share_link_revoked', 'status'],
        });
        if (!trip)
            throw new errors_1.NotFoundError('Trip');
        if (trip.share_link_revoked) {
            throw new errors_1.AppError('This share link has been revoked', 410, 'SHARE_LINK_REVOKED');
        }
        if (trip.share_link_expires_at && new Date() > trip.share_link_expires_at) {
            throw new errors_1.ShareLinkExpiredError();
        }
        const locations = await models_1.TripLocation.findAll({
            where: { trip_id: trip.id },
            attributes: ['lat', 'lng', 'accuracy', 'recorded_at'],
            order: [['recorded_at', 'ASC']],
        });
        (0, response_1.sendSuccess)(res, { locations, status: trip.status });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
