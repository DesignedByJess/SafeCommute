import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../utils/response';
import { EmergencyService } from '../services/emergency.service';
import { triggerEmergencySchema, retractEmergencySchema } from '../middleware/validate/emergency.schema';
import { emergencyLimiter } from '../middleware/rate-limit';

const router = Router();
const emergencyService = new EmergencyService();

router.use(authenticate);

router.post('/:tripId/trigger', emergencyLimiter, validate(triggerEmergencySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await emergencyService.triggerEmergency(
      req.user!.id, req.params.tripId, req.body,
      { ip: req.ip || '', userAgent: req.headers['user-agent'] || '' },
    );
    sendSuccess(res, {
      id: alert.id, trip_id: alert.trip_id,
      lat: alert.lat, lng: alert.lng, triggered_at: alert.triggered_at,
    }, 201);
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
