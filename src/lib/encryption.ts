import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

export function getOrCreateEncryptionKey(): string {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && envKey.length > 0) {
    return envKey;
  }
  // Generate a new random key and return as hex
  const key = crypto.randomBytes(KEY_LENGTH).toString('hex');
  console.warn(
    '[encryption] ENCRYPTION_KEY env var is not set. Generated a temporary key. ' +
    'Set ENCRYPTION_KEY=' + key + ' in your .env file to persist encrypted data.'
  );
  return key;
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const keyHex = getOrCreateEncryptionKey();
  // Derive a 32-byte key from the hex string
  const key = Buffer.from(keyHex.slice(0, KEY_LENGTH * 2).padEnd(KEY_LENGTH * 2, '0'), 'hex');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encryptedBuffer = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Append authTag to encrypted data, then base64 encode
  const encryptedWithTag = Buffer.concat([encryptedBuffer, authTag]);

  return {
    encrypted: encryptedWithTag.toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decrypt(encrypted: string, iv: string): string {
  const keyHex = getOrCreateEncryptionKey();
  const key = Buffer.from(keyHex.slice(0, KEY_LENGTH * 2).padEnd(KEY_LENGTH * 2, '0'), 'hex');

  const ivBuffer = Buffer.from(iv, 'base64');
  const encryptedWithTag = Buffer.from(encrypted, 'base64');

  // Split auth tag from the end of encrypted data
  const encryptedData = encryptedWithTag.slice(0, encryptedWithTag.length - AUTH_TAG_LENGTH);
  const authTag = encryptedWithTag.slice(encryptedWithTag.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
