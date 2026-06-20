"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRetentionService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const audit_service_1 = require("./audit.service");
class DataRetentionService {
    async purgeExpiredTrips() {
        const count = await models_1.Trip.destroy({
            where: { expires_at: { [sequelize_1.Op.lt]: new Date() } },
        });
        if (count > 0)
            audit_service_1.logger.info(`Purged ${count} expired trips`);
        return count;
    }
    async purgeSoftDeletedContacts() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const count = await models_1.Contact.destroy({
            where: { deleted_at: { [sequelize_1.Op.lt]: sevenDaysAgo } },
            force: true,
        });
        if (count > 0)
            audit_service_1.logger.info(`Hard-deleted ${count} soft-deleted contacts`);
        return count;
    }
    async purgeOldAuditLogs() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const count = await models_1.AuditLog.destroy({
            where: { created_at: { [sequelize_1.Op.lt]: thirtyDaysAgo } },
        });
        if (count > 0)
            audit_service_1.logger.info(`Purged ${count} old audit logs`);
        return count;
    }
    async purgeAll() {
        await this.purgeExpiredTrips();
        await this.purgeSoftDeletedContacts();
        await this.purgeOldAuditLogs();
    }
}
exports.DataRetentionService = DataRetentionService;
