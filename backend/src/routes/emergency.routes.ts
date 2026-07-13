import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../utils/response';
import { EmergencyService } from '../services/emergency.service';
import { initiateEmergencySchema, verifyEmergencySchema, retractEmergencySchema } from '../middleware/validate/emergency.schema';
import { emergencyLimiter } from '../middleware/rate-limit';

const router = Router();
const emergencyService = new EmergencyService();

router.use(authenticate);

router.post('/:tripId/initiate', emergencyLimiter, validate(initiateEmergencySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await emergencyService.initiateEmergency(
      req.user!.id, req.params.tripId, req.body,
      { ip: req.ip || '', userAgent: req.headers['user-agent'] || '' },
    );
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/:tripId/verify', validate(verifyEmergencySchema), async (req: Request, res: Response, next: NextFunction) => {
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
