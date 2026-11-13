import { isPasswordHash } from '../utils/password.js';

function required(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Falta configurar ${name}.`);
  }
  return value.trim();
}

function integer(value, name, min, max) {
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`${name} debe ser un entero entre ${min} y ${max}.`);
  }
  return Number(value);
}

export function loadConfig(env = process.env) {
  if (env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('No se admite el emulador en este servidor. Usá las pruebas simuladas.');
  }
  const projectId = required(env, 'FIREBASE_PROJECT_ID');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
    throw new Error('FIREBASE_PROJECT_ID no tiene un formato válido.');
  }
  const adminUsername = required(env, 'ADMIN_USERNAME');
  if (adminUsername.length > 100) throw new Error('ADMIN_USERNAME es demasiado largo.');
  const adminPasswordHash = required(env, 'ADMIN_PASSWORD_HASH');
  if (!isPasswordHash(adminPasswordHash)) {
    throw new Error('ADMIN_PASSWORD_HASH debe generarse con npm run password:hash.');
  }
  const jwtSecret = required(env, 'JWT_SECRET');
  if (!/^[a-f0-9]{64}$/i.test(jwtSecret)) {
    throw new Error('JWT_SECRET debe contener 32 bytes aleatorios en formato hexadecimal.');
  }
  const corsOrigins = (env.CORS_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of corsOrigins) {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error('CORS_ORIGINS debe contener orígenes HTTP o HTTPS sin rutas.');
    }
  }
  return {
    port: integer(env.PORT ?? '3000', 'PORT', 1, 65535),
    projectId,
    credentialsPath: required(env, 'GOOGLE_APPLICATION_CREDENTIALS'),
    adminUsername,
    adminPasswordHash,
    jwtSecret: Buffer.from(jwtSecret, 'hex'),
    jwtExpiresIn: integer(env.JWT_EXPIRES_IN_SECONDS ?? '3600', 'JWT_EXPIRES_IN_SECONDS', 60, 86400),
    corsOrigins,
  };
}
