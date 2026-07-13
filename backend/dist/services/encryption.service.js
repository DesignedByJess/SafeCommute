"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
// Derive 32-byte keys for AES-256 from environment variables using SHA-256
const MASTER_KEY = crypto_1.default.createHash('sha256').update(process.env.MASTER_KEY || 'default-master-key').digest();
const PHONE_KEY = crypto_1.default.createHash('sha256').update(process.env.PHONE_KEY || 'default-phone-key').digest();
class EncryptionService {
    /**
     * Encrypt a phone number using AES-256-GCM
     */
    static encryptPhone(phone) {
        const iv = crypto_1.default.randomBytes(12);
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', PHONE_KEY, iv);
        let encrypted = cipher.update(phone, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        // Format: iv:authTag:encrypted
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }
    /**
     * Decrypt a phone number using AES-256-GCM
     */
    static decryptPhone(encryptedPhone) {
        try {
            const parts = encryptedPhone.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted phone format');
            }
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encryptedText = Buffer.from(parts[2], 'hex');
            const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', PHONE_KEY, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedText, undefined, 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (err) {
            throw new Error('Phone decryption failed');
        }
    }
    /**
     * Generate SHA-256 hash of a phone number for deduplication
     */
    static hashPhone(phone) {
        return crypto_1.default
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
    static encryptPlate(plate) {
        // 1. Generate a per-trip data key
        const dataKey = crypto_1.default.randomBytes(32);
        // 2. Encrypt license plate with data key (AES-256-GCM)
        const plateIv = crypto_1.default.randomBytes(12);
        const plateCipher = crypto_1.default.createCipheriv('aes-256-gcm', dataKey, plateIv);
        let encryptedPlate = plateCipher.update(plate, 'utf8', 'hex');
        encryptedPlate += plateCipher.final('hex');
        const plateAuthTag = plateCipher.getAuthTag().toString('hex');
        const formattedPlate = `${plateIv.toString('hex')}:${plateAuthTag}:${encryptedPlate}`;
        // 3. Encrypt data key with MASTER_KEY (AES-256-CBC)
        const dataKeyIv = crypto_1.default.randomBytes(16);
        const dataKeyCipher = crypto_1.default.createCipheriv('aes-256-cbc', MASTER_KEY, dataKeyIv);
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
    static decryptPlate(encryptedPlate, encryptedDataKey) {
        try {
            // 1. Decrypt data key using MASTER_KEY (AES-256-CBC)
            const dataKeyParts = encryptedDataKey.split(':');
            if (dataKeyParts.length !== 2) {
                throw new Error('Invalid encrypted data key format');
            }
            const dataKeyIv = Buffer.from(dataKeyParts[0], 'hex');
            const dataKeyEncrypted = Buffer.from(dataKeyParts[1], 'hex');
            const dataKeyDecipher = crypto_1.default.createDecipheriv('aes-256-cbc', MASTER_KEY, dataKeyIv);
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
            const plateDecipher = crypto_1.default.createDecipheriv('aes-256-gcm', decryptedDataKey, plateIv);
            plateDecipher.setAuthTag(plateAuthTag);
            let decryptedPlate = plateDecipher.update(plateEncrypted, undefined, 'utf8');
            decryptedPlate += plateDecipher.final('utf8');
            return decryptedPlate;
        }
        catch (err) {
            throw new Error('Plate decryption failed');
        }
    }
}
exports.EncryptionService = EncryptionService;
