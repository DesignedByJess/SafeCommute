import { Router } from 'express';
import authRoutes from './auth.routes';
import contactsRoutes from './contacts.routes';
import tripsRoutes from './trips.routes';
import emergencyRoutes from './emergency.routes';
import shareRoutes from './share.routes';
import paymentsRoutes from './payments.routes';
import ocrRoutes from './ocr.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/contacts', contactsRoutes);
router.use('/trips', tripsRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/share', shareRoutes);
router.use('/payments', paymentsRoutes);
router.use('/ocr', ocrRoutes);

export default router;
