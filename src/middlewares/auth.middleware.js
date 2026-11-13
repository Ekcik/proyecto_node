import jwt from 'jsonwebtoken';
import { jwtOptions } from '../services/auth.service.js';
import { HttpError } from '../utils/http-error.js';

export function authenticate(config) {
  return (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('Authorization') ?? '');
    if (!match) return next(new HttpError(401, 'Se requiere un Bearer Token válido.'));
    try {
      const payload = jwt.verify(match[1], config.jwtSecret, {
        algorithms: [jwtOptions.algorithm],
        issuer: jwtOptions.issuer,
        audience: jwtOptions.audience,
      });
      if (typeof payload !== 'object' || typeof payload.sub !== 'string' || !payload.sub
        || !Number.isInteger(payload.exp)) {
        throw new Error('Claims obligatorios ausentes.');
      }
      req.user = payload;
      next();
    } catch {
      next(new HttpError(401, 'Token inválido o vencido.'));
    }
  };
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return next(new HttpError(403, 'Se requieren permisos de administrador.'));
  }
  next();
}
