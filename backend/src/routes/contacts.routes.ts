import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { ContactService } from '../services/contacts.service';
import { EncryptionService } from '../services/encryption.service';
import { createContactSchema, verifyOtpSchema } from '../middleware/validate/contact.schema';
import { otpLimiter } from '../middleware/rate-limit';
import { maskPhone } from '../utils/sanitize';

const router = Router();
const contactService = new ContactService();

router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacts = await contactService.listContacts(req.user!.id);
    const masked = contacts.map((c) => {
      const json = c.toJSON();
      let displayPhone = json.phone_number_encrypted;
      try {
        const decrypted = EncryptionService.decryptPhone(json.phone_number_encrypted);
        displayPhone = maskPhone(decrypted);
      } catch {
        displayPhone = maskPhone(json.phone_number_encrypted);
      }
      return { ...json, phone_number_encrypted: displayPhone };
    });
    sendSuccess(res, masked);
  } catch (err) { next(err); }
});

router.post('/', validate(createContactSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await contactService.addContact(req.user!.id, req.body);
    let displayPhone = result.phone_number_encrypted;
    try {
      const decrypted = EncryptionService.decryptPhone(result.phone_number_encrypted);
      displayPhone = maskPhone(decrypted);
    } catch {
      displayPhone = maskPhone(result.phone_number_encrypted);
    }
    const payload: Record<string, unknown> = {
      id: result.id,
      name: result.name,
      phone_number_encrypted: displayPhone,
      relationship: result.relationship,
      verified: result.verified,
      created_at: result.created_at,
    };
    if (result.devOtp) {
      payload.devOtp = result.devOtp;
    }
    sendCreated(res, payload);
  } catch (err) { next(err); }
});

router.post('/:id/verify-otp', otpLimiter, validate(verifyOtpSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await contactService.verifyOtp(req.user!.id, req.params.id, req.body.otp);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await contactService.getContact(req.user!.id, req.params.id);
    const data = contact.toJSON();
    try {
      const decrypted = EncryptionService.decryptPhone(data.phone_number_encrypted);
      data.phone_number_encrypted = maskPhone(decrypted);
    } catch {
      data.phone_number_encrypted = maskPhone(data.phone_number_encrypted);
    }
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.post('/:id/resend-otp', otpLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await contactService.resendOtp(req.user!.id, req.params.id);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await contactService.deleteContact(req.user!.id, req.params.id);
    sendNoContent(res);
  } catch (err) { next(err); }
});

export default router;
