import jwt from 'jsonwebtoken';
import { verifyPassword } from '../utils/password.js';
import { HttpError } from '../utils/http-error.js';

export const jwtOptions = { algorithm: 'HS256', issuer: 'techlab-products-api', audience: 'techlab-products-clients' };

export function createAuthService(config) {
  return {
    async login(body) {
      if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).some(key => !['username', 'password'].includes(key))
        || typeof body.username !== 'string' || !body.username.trim() || body.username.length > 100
        || typeof body.password !== 'string' || !body.password || body.password.length > 128) {
        throw new HttpError(400, 'Se requieren username y password válidos.');
      }
      const passwordMatches = await verifyPassword(body.password, config.adminPasswordHash);
      if (body.username !== config.adminUsername || !passwordMatches) {
        throw new HttpError(401, 'Credenciales inválidas.');
      }
      const accessToken = jwt.sign({ role: 'admin' }, config.jwtSecret, {
        ...jwtOptions,
        subject: config.adminUsername,
        expiresIn: config.jwtExpiresIn,
      });
      return { accessToken, tokenType: 'Bearer', expiresIn: config.jwtExpiresIn };
    },
  };
}
