import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';

export function productsRoutes(controller, config) {
  const router = Router();
  const protectedRoute = [authenticate(config), requireAdmin];
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/create', ...protectedRoute, controller.create);
  router.put('/:id', ...protectedRoute, controller.update);
  router.delete('/:id', ...protectedRoute, controller.remove);
  return router;
}
