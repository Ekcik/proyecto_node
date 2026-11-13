import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { createProductsService } from './services/products.service.js';
import { createAuthService } from './services/auth.service.js';
import { createProductsController } from './controllers/products.controller.js';
import { createAuthController } from './controllers/auth.controller.js';
import { productsRoutes } from './routes/products.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

// La dependencia del modelo permite probar HTTP sin inicializar Firebase.
export function createApp({ config, productsModel }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      callback(null, Boolean(origin && config.corsOrigins.includes(origin)));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(bodyParser.json({ limit: '16kb' }));
  const products = createProductsController(createProductsService(productsModel));
  const auth = createAuthController(createAuthService(config));
  app.use('/api/products', productsRoutes(products, config));
  app.use('/api/auth', authRoutes(auth));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
