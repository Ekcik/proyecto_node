import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const options = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const format = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/;

export function isPasswordHash(value) {
  return typeof value === 'string' && format.test(value);
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  }
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, options);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, encodedHash) {
  const match = typeof encodedHash === 'string' && format.exec(encodedHash);
  if (!match || typeof password !== 'string' || password.length > 128) return false;
  const [, salt, expected] = match;
  const actual = await scrypt(password, salt, 64, options);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
