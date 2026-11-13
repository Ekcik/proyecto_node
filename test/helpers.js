import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/utils/password.js';
import { jwtOptions } from '../src/services/auth.service.js';

// Credenciales efímeras exclusivas de las pruebas: nunca se conectan a Firebase.
export const testPassword = randomBytes(24).toString('hex');
export const testConfig = {
  adminUsername: 'test-admin',
  adminPasswordHash: await hashPassword(testPassword),
  jwtSecret: randomBytes(32),
  jwtExpiresIn: 3600,
  corsOrigins: ['http://localhost:5173'],
};
export const validProduct = { title: 'Cuaderno', price: 1250.50, category: 'Librería', description: '80 hojas' };

export function signToken(payload = { role: 'admin' }, options = {}, key = testConfig.jwtSecret) {
  return jwt.sign(payload, key, {
    ...jwtOptions,
    subject: testConfig.adminUsername,
    expiresIn: testConfig.jwtExpiresIn,
    ...options,
  });
}

export function fixture(overrides = {}) {
  const records = new Map();
  let nextId = 0;
  const model = {
    async findAll() { return [...records.values()]; },
    async findById(id) { return records.get(id) ?? null; },
    async create(data) {
      const product = { ...data, id: `test-product-${++nextId}` };
      records.set(product.id, product);
      return product;
    },
    async update(id, data) {
      if (!records.has(id)) return null;
      const product = { ...data, id };
      records.set(id, product);
      return product;
    },
    async remove(id) { return records.delete(id); },
    ...overrides,
  };
  return { app: createApp({ config: testConfig, productsModel: model }), model, records };
}
