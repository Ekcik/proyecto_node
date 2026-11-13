import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

export function authRoutes(controller) {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { status: 429, message: 'Demasiados intentos de login. Intentá nuevamente en 15 minutos.' } },
  });
  router.post('/login', loginLimiter, controller.login);
  return router;
}
