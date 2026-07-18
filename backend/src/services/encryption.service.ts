import crypto from 'crypto';
import { env } from '../utils/config';

// Derive 32-byte keys for AES-256 from validated environment variables using SHA-256.
// env.MASTER_KEY / env.PHONE_KEY are required — config.ts throws at startup if missing.
const MASTER_KEY = crypto.createHash('sha256').update(env.MASTER_KEY).digest();
const PHONE_KEY = crypto.createHash('sha256').update(env.PHONE_KEY).digest();

export class EncryptionService {
  /**
   * Encrypt a phone number using AES-256-GCM
   */
  static encryptPhone(phone: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', PHONE_KEY, iv);
    
    let encrypted = cipher.update(phone, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt a phone number using AES-256-GCM
   */
  static decryptPhone(encryptedPhone: string): string {
    try {
      const parts = encryptedPhone.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted phone format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = Buffer.from(parts[2], 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', PHONE_KEY, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      throw new Error('Phone decryption failed');
    }
  }

  /**
   * Generate SHA-256 hash of a phone number for deduplication
   */
  static hashPhone(phone: string): string {
    return crypto
      .createHash('sha256')
      .update(phone)
      .digest('hex');
  }

  /**
   * Envelope encryption for license plates:
   * 1. Generate a per-trip data key (32-char cryptographically random)
   * 2. Encrypt plate with data key using AES-256-GCM
   * 3. Encrypt data key with MASTER_KEY (representing KMS key) using AES-256-CBC
   * 4. Return both encrypted plate and encrypted data key
   */
  static encryptPlate(plate: string): { encryptedPlate: string; encryptedDataKey: string } {
    // 1. Generate a per-trip data key
    const dataKey = crypto.randomBytes(32);

    // 2. Encrypt license plate with data key (AES-256-GCM)
    const plateIv = crypto.randomBytes(12);
    const plateCipher = crypto.createCipheriv('aes-256-gcm', dataKey, plateIv);
    let encryptedPlate = plateCipher.update(plate, 'utf8', 'hex');
    encryptedPlate += plateCipher.final('hex');
    const plateAuthTag = plateCipher.getAuthTag().toString('hex');
    const formattedPlate = `${plateIv.toString('hex')}:${plateAuthTag}:${encryptedPlate}`;

    // 3. Encrypt data key with MASTER_KEY (AES-256-CBC)
    const dataKeyIv = crypto.randomBytes(16);
    const dataKeyCipher = crypto.createCipheriv('aes-256-cbc', MASTER_KEY, dataKeyIv);
    let encryptedDataKey = dataKeyCipher.update(dataKey, undefined, 'hex');
    encryptedDataKey += dataKeyCipher.final('hex');
    const formattedDataKey = `${dataKeyIv.toString('hex')}:${encryptedDataKey}`;

    return {
      encryptedPlate: formattedPlate,
      encryptedDataKey: formattedDataKey,
    };
  }

  /**
   * Decrypt envelope encrypted license plate
   */
  static decryptPlate(encryptedPlate: string, encryptedDataKey: string): string {
    try {
      // 1. Decrypt data key using MASTER_KEY (AES-256-CBC)
      const dataKeyParts = encryptedDataKey.split(':');
      if (dataKeyParts.length !== 2) {
        throw new Error('Invalid encrypted data key format');
      }
      const dataKeyIv = Buffer.from(dataKeyParts[0], 'hex');
      const dataKeyEncrypted = Buffer.from(dataKeyParts[1], 'hex');
      
      const dataKeyDecipher = crypto.createDecipheriv('aes-256-cbc', MASTER_KEY, dataKeyIv);
      let decryptedDataKey = dataKeyDecipher.update(dataKeyEncrypted);
      decryptedDataKey = Buffer.concat([decryptedDataKey, dataKeyDecipher.final()]);

      // 2. Decrypt license plate using decrypted data key (AES-256-GCM)
      const plateParts = encryptedPlate.split(':');
      if (plateParts.length !== 3) {
        throw new Error('Invalid encrypted plate format');
      }
      const plateIv = Buffer.from(plateParts[0], 'hex');
      const plateAuthTag = Buffer.from(plateParts[1], 'hex');
      const plateEncrypted = Buffer.from(plateParts[2], 'hex');

      const plateDecipher = crypto.createDecipheriv('aes-256-gcm', decryptedDataKey, plateIv);
      plateDecipher.setAuthTag(plateAuthTag);
      
      let decryptedPlate = plateDecipher.update(plateEncrypted, undefined, 'utf8');
      decryptedPlate += plateDecipher.final('utf8');

      return decryptedPlate;
    } catch (err) {
      throw new Error('Plate decryption failed');
    }
  }
}
