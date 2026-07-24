import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../utils/response';
import { EmergencyService } from '../services/emergency.service';
import { initiateEmergencySchema, verifyEmergencySchema, retractEmergencySchema } from '../middleware/validate/emergency.schema';
import { emergencyLimiter, emergencyVerifyLimiter } from '../middleware/rate-limit';
import { UserProfile } from '../models/user-profile.model';
import { EncryptionService } from '../services/encryption.service';

const router = Router();
const emergencyService = new EmergencyService();

router.use(authenticate);

router.post('/:tripId/initiate', emergencyLimiter, validate(initiateEmergencySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let userPhone: string | undefined;
    const profile = await UserProfile.findByPk(req.user!.id);
    if (profile?.phone_encrypted) {
      try {
        userPhone = EncryptionService.decryptPhone(profile.phone_encrypted);
      } catch {
        userPhone = req.user!.phone || undefined;
      }
    } else {
      userPhone = req.user!.phone || undefined;
    }

    const result = await emergencyService.initiateEmergency(
      req.user!.id, req.params.tripId,
      { ...req.body, userPhone },
      { ip: req.ip || '', userAgent: req.headers['user-agent'] || '' },
    );
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/:tripId/verify', emergencyVerifyLimiter, validate(verifyEmergencySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await emergencyService.verifyAndTrigger(req.user!.id, req.params.tripId, req.body.code);
    sendSuccess(res, alert, 201);
  } catch (err) { next(err); }
});

router.post('/:alertId/retract', validate(retractEmergencySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await emergencyService.retractAlert(req.user!.id, req.params.alertId, req.body.reason);
    sendSuccess(res, { id: alert.id, retracted_at: alert.retracted_at });
  } catch (err) { next(err); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await emergencyService.listAlerts(req.user!.id);
    sendSuccess(res, alerts);
  } catch (err) { next(err); }
});

export default router;
