process.env.PHONE_KEY = '0123456789abcdef0123456789abcdef';
process.env.MASTER_KEY = 'fedcba9876543210fedcba9876543210';

import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  describe('encryptPhone / decryptPhone', () => {
    it('encrypts and decrypts a phone number', () => {
      const phone = '+2348012345678';
      const encrypted = EncryptionService.encryptPhone(phone);
      expect(encrypted).toContain(':');
      const decrypted = EncryptionService.decryptPhone(encrypted);
      expect(decrypted).toBe(phone);
    });

    it('produces different ciphertexts for the same input', () => {
      const phone = '+2348012345678';
      const e1 = EncryptionService.encryptPhone(phone);
      const e2 = EncryptionService.encryptPhone(phone);
      expect(e1).not.toBe(e2);
    });

    it('throws on invalid encrypted format', () => {
      expect(() => EncryptionService.decryptPhone('invalid-format')).toThrow(
        'Phone decryption failed',
      );
    });

    it('throws on tampered ciphertext', () => {
      const phone = '+2348012345678';
      const encrypted = EncryptionService.encryptPhone(phone);
      const parts = encrypted.split(':');
      const tampered = `${parts[0]}:${parts[1]}:ffff`;
      expect(() => EncryptionService.decryptPhone(tampered)).toThrow(
        'Phone decryption failed',
      );
    });

    it('throws on empty string', () => {
      expect(() => EncryptionService.decryptPhone('')).toThrow(
        'Phone decryption failed',
      );
    });
  });

  describe('hashPhone', () => {
    it('produces a SHA-256 hex hash', () => {
      const hash = EncryptionService.hashPhone('+2348012345678');
      expect(hash).toEqual(expect.any(String));
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic', () => {
      const h1 = EncryptionService.hashPhone('+2348012345678');
      const h2 = EncryptionService.hashPhone('+2348012345678');
      expect(h1).toBe(h2);
    });

    it('produces different hashes for different numbers', () => {
      const h1 = EncryptionService.hashPhone('+2348012345678');
      const h2 = EncryptionService.hashPhone('+2348012345679');
      expect(h1).not.toBe(h2);
    });
  });

  describe('encryptPlate / decryptPlate', () => {
    it('encrypts and decrypts a plate number', () => {
      const plate = 'ABC-123XY';
      const { encryptedPlate, encryptedDataKey } = EncryptionService.encryptPlate(plate);
      expect(encryptedPlate).toContain(':');
      expect(encryptedDataKey).toContain(':');
      const decrypted = EncryptionService.decryptPlate(encryptedPlate, encryptedDataKey);
      expect(decrypted).toBe(plate);
    });

    it('produces different ciphertexts for the same plate', () => {
      const plate = 'XYZ-456AB';
      const r1 = EncryptionService.encryptPlate(plate);
      const r2 = EncryptionService.encryptPlate(plate);
      expect(r1.encryptedPlate).not.toBe(r2.encryptedPlate);
      expect(r1.encryptedDataKey).not.toBe(r2.encryptedDataKey);
    });

    it('throws on invalid encrypted plate format', () => {
      expect(() => EncryptionService.decryptPlate('bad', 'iv:data')).toThrow(
        'Plate decryption failed',
      );
    });

    it('throws on invalid encrypted data key format', () => {
      const { encryptedPlate, encryptedDataKey } = EncryptionService.encryptPlate('TEST-123');
      expect(() => EncryptionService.decryptPlate(encryptedPlate, 'bad-key')).toThrow(
        'Plate decryption failed',
      );
    });

    it('throws on tampered plate data', () => {
      const { encryptedPlate, encryptedDataKey } = EncryptionService.encryptPlate('TEST-123');
      const parts = encryptedPlate.split(':');
      const tampered = `${parts[0]}:${parts[1]}:ffff`;
      expect(() => EncryptionService.decryptPlate(tampered, encryptedDataKey)).toThrow(
        'Plate decryption failed',
      );
    });
  });
});
