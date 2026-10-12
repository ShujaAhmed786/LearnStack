import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash the 6-digit OTP code using bcrypt with 10 rounds
 */
export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

/**
 * Timing-safe verification of the user's input against the stored bcrypt hash
 */
export async function verifyCode(input: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(input, hashed);
}
