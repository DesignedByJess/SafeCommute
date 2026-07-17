import { Op } from 'sequelize';
import { Trip, Contact, AuditLog } from '../models';
import { logger } from './audit.service';

export class DataRetentionService {
  async purgeExpiredTrips(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const count = await Trip.destroy({
      where: {
        [Op.or]: [
          { expires_at: { [Op.lt]: thirtyDaysAgo }, status: { [Op.ne]: 'emergency' } },
          { expires_at: { [Op.lt]: ninetyDaysAgo }, status: 'emergency' },
        ],
      },
    });
    if (count > 0) logger.info(`Purged ${count} expired trips`);
    return count;
  }

  async purgeSoftDeletedContacts(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const count = await Contact.destroy({
      where: { deleted_at: { [Op.lt]: sevenDaysAgo } },
      force: true,
    });
    if (count > 0) logger.info(`Hard-deleted ${count} soft-deleted contacts`);
    return count;
  }

  async purgeOldAuditLogs(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await AuditLog.destroy({
      where: { created_at: { [Op.lt]: thirtyDaysAgo } },
    });
    if (count > 0) logger.info(`Purged ${count} old audit logs`);
    return count;
  }

  async purgeAll(): Promise<void> {
    await this.purgeExpiredTrips();
    await this.purgeSoftDeletedContacts();
    await this.purgeOldAuditLogs();
  }
}
