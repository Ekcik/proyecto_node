import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { loadConfig } from '../src/config/env.js';
import { connectFirestore } from '../src/config/firebase.js';
import { createProductsModel } from '../src/models/products.model.js';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/utils/password.js';

test('CRUD real en Firestore con documento temporal propio', { timeout: 60000 }, async () => {
  // Este archivo sólo se ejecuta con npm run test:firestore. No reemplaza Firestore.
  let config;
  let connection;
  try {
    config = loadConfig();
    connection = await connectFirestore(config);
  } catch {
    throw new Error('Configurá .env y el acceso real a un proyecto Firebase de pruebas según README.md.');
  }
  const model = createProductsModel(connection.db);
  const createdIds = new Set();
  try {
    // La cuenta HTTP de este proceso es efímera; no necesita conocer la contraseña real.
    const password = randomBytes(24).toString('hex');
    const app = createApp({
      config: { ...config, adminPasswordHash: await hashPassword(password) },
      productsModel: {
        ...model,
        async create(data) {
          const product = await model.create(data);
          createdIds.add(product.id);
          return product;
        },
      },
    });
    const login = await request(app).post('/api/auth/login')
      .send({ username: config.adminUsername, password }).expect(200);
    const auth = `Bearer ${login.body.accessToken}`;
    const product = { title: `Prueba ${randomBytes(8).toString('hex')}`, price: 10, category: 'Pruebas', description: 'Documento temporal' };
    const created = await request(app).post('/api/products/create').set('Authorization', auth).send(product).expect(201);
    const path = `/api/products/${created.body.id}`;
    const found = await request(app).get(path).expect(200);
    assert.deepEqual(found.body, created.body);
    const updated = await request(app).put(path).set('Authorization', auth).send({ ...product, price: 20 }).expect(200);
    assert.equal(updated.body.id, created.body.id);
    const persisted = await request(app).get(path).expect(200);
    assert.equal(persisted.body.price, 20);
    const listed = await request(app).get('/api/products').expect(200);
    assert.ok(listed.body.some(item => item.id === created.body.id));
    await request(app).delete(path).set('Authorization', auth).expect(204);
    await request(app).get(path).expect(404);
    await request(app).put(path).set('Authorization', auth).send(product).expect(404);
    await request(app).delete(path).set('Authorization', auth).expect(404);
    createdIds.delete(created.body.id);
  } finally {
    try {
      for (const id of createdIds) await model.remove(id);
    } finally {
      await connection.close();
    }
  }
});
