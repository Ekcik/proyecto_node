import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { fixture, validProduct, signToken, testConfig, testPassword } from './helpers.js';
import { jwtOptions } from '../src/services/auth.service.js';

test('GET público acepta ambas formas de la ruta y devuelve una lista vacía', async () => {
  const { app } = fixture();
  for (const path of ['/api/products', '/api/products/']) {
    const response = await request(app).get(path).expect(200).expect('Content-Type', /json/);
    assert.deepEqual(response.body, []);
    assert.equal(response.headers['x-powered-by'], undefined);
  }
});

test('login emite un JWT firmado con HS256, sujeto, rol y vencimiento', async () => {
  const { app } = fixture();
  const response = await request(app).post('/api/auth/login')
    .send({ username: testConfig.adminUsername, password: testPassword }).expect(200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.body.tokenType, 'Bearer');
  assert.equal(response.body.expiresIn, 3600);
  const payload = jwt.verify(response.body.accessToken, testConfig.jwtSecret, {
    algorithms: ['HS256'], issuer: jwtOptions.issuer, audience: jwtOptions.audience,
  });
  assert.equal(payload.sub, testConfig.adminUsername);
  assert.equal(payload.role, 'admin');
  assert.equal(payload.exp - payload.iat, 3600);
  assert.equal(jwt.decode(response.body.accessToken, { complete: true }).header.alg, 'HS256');
  assert.equal(response.body.password, undefined);
});

test('flujo HTTP completo: login, crear, listar, consultar, actualizar y eliminar', async () => {
  const { app } = fixture();
  const login = await request(app).post('/api/auth/login')
    .send({ username: testConfig.adminUsername, password: testPassword }).expect(200);
  const auth = `Bearer ${login.body.accessToken}`;
  const created = await request(app).post('/api/products/create').set('Authorization', auth)
    .send({ ...validProduct, title: '  Cuaderno  ' }).expect(201);
  const path = `/api/products/${created.body.id}`;
  assert.equal(created.headers.location, path);
  assert.equal(created.body.title, 'Cuaderno');
  assert.equal(typeof created.body.id, 'string');
  const listed = await request(app).get('/api/products').expect(200);
  assert.deepEqual(listed.body, [created.body]);
  const found = await request(app).get(path).expect(200);
  assert.deepEqual(found.body, created.body);
  const updated = await request(app).put(path).set('Authorization', auth)
    .send({ ...validProduct, price: 0 }).expect(200);
  assert.equal(updated.body.price, 0);
  assert.equal(updated.body.id, created.body.id);
  const persisted = await request(app).get(path).expect(200);
  assert.equal(persisted.body.price, 0);
  const deleted = await request(app).delete(path).set('Authorization', auth).expect(204);
  assert.equal(deleted.text, '');
  await request(app).get(path).expect(404);
  await request(app).delete(path).set('Authorization', auth).expect(404);
  await request(app).get('/api/products').expect(200, []);
});

for (const [name, body] of [
  ['cuerpo vacío', {}], ['sin password', { username: 'admin' }],
  ['sin username', { password: 'irrelevant' }], ['username numérico', { username: 3, password: 'x' }],
  ['password numérico', { username: 'admin', password: 3 }], ['array', []],
  ['usuario vacío', { username: ' ', password: 'x' }],
  ['contraseña muy larga', { username: 'admin', password: 'x'.repeat(129) }],
  ['rol enviado por cliente', { username: 'admin', password: 'x', role: 'admin' }],
]) {
  test(`login rechaza ${name} con 400`, async () => {
    await request(fixture().app).post('/api/auth/login').send(body).expect(400);
  });
}

test('login no distingue usuario inexistente de contraseña incorrecta: 401', async () => {
  const { app } = fixture();
  const wrongUser = await request(app).post('/api/auth/login')
    .send({ username: 'otro-usuario', password: testPassword }).expect(401);
  const wrongPassword = await request(app).post('/api/auth/login')
    .send({ username: testConfig.adminUsername, password: randomBytes(24).toString('hex') }).expect(401);
  assert.deepEqual(wrongUser.body, wrongPassword.body);
  assert.equal(wrongUser.headers['www-authenticate'], 'Bearer');
});

test('login limita intentos por IP con respuesta JSON 429', async () => {
  const { app } = fixture();
  for (let attempt = 0; attempt < 10; attempt++) {
    await request(app).post('/api/auth/login').send({}).expect(400);
  }
  const response = await request(app).post('/api/auth/login').send({}).expect(429);
  assert.equal(response.body.error.status, 429);
  assert.ok(response.headers['retry-after']);
});

for (const [method, path] of [
  ['post', '/api/products/create'], ['put', '/api/products/existing-id'], ['delete', '/api/products/existing-id'],
]) {
  test(`${method.toUpperCase()} exige autenticación y distingue permisos insuficientes`, async () => {
    const { app, records } = fixture();
    for (const header of [undefined, 'Basic abc', 'Bearer', 'Bearer invalid.token', 'Bearer a b']) {
      const call = request(app)[method](path);
      if (header) call.set('Authorization', header);
      await call.send(validProduct).expect(401);
    }
    for (const role of ['reader', undefined]) {
      const response = await request(app)[method](path).set('Authorization', `Bearer ${signToken({ role })}`)
        .send(validProduct).expect(403);
      assert.equal(response.body.error.status, 403);
    }
    assert.equal(records.size, 0);
  });
}

for (const [name, token] of [
  ['vencido', signToken({ role: 'admin' }, { expiresIn: -1 })],
  ['firma ajena', signToken({ role: 'admin' }, {}, randomBytes(32))],
  ['algoritmo distinto', signToken({ role: 'admin' }, { algorithm: 'HS384' })],
  ['issuer ajeno', signToken({ role: 'admin' }, { issuer: 'otro-servidor' })],
  ['audience ajena', signToken({ role: 'admin' }, { audience: 'otro-cliente' })],
  ['todavía no válido', signToken({ role: 'admin' }, { notBefore: 3600 })],
  ['sin expiración', jwt.sign({ role: 'admin' }, testConfig.jwtSecret, { ...jwtOptions, subject: testConfig.adminUsername })],
  ['sin sujeto', jwt.sign({ role: 'admin' }, testConfig.jwtSecret, { ...jwtOptions, expiresIn: 3600 })],
  ['sin firma', jwt.sign({ role: 'admin' }, '', { algorithm: 'none' })],
]) {
  test(`JWT ${name} devuelve 401`, async () => {
    const response = await request(fixture().app).post('/api/products/create')
      .set('Authorization', `Bearer ${token}`).send(validProduct).expect(401);
    assert.equal(response.body.error.status, 401);
    assert.ok(!response.text.includes(token));
  });
}

for (const [name, body] of [
  ['objeto vacío', {}], ['array', []], ['título vacío', { ...validProduct, title: ' ' }],
  ['título extenso', { ...validProduct, title: 'x'.repeat(151) }],
  ['categoría inválida', { ...validProduct, category: 2 }],
  ['categoría extensa', { ...validProduct, category: 'x'.repeat(81) }],
  ['precio negativo', { ...validProduct, price: -1 }],
  ['precio en texto', { ...validProduct, price: '100' }],
  ['precio ausente', { title: 'Cuaderno', category: 'Librería' }],
  ['precio excesivo', { ...validProduct, price: 1000000001 }],
  ['precio null', { ...validProduct, price: null }],
  ['descripción inválida', { ...validProduct, description: 123 }],
  ['descripción extensa', { ...validProduct, description: 'x'.repeat(2001) }],
  ['ID enviado por cliente', { ...validProduct, id: 'mi-id' }],
  ['campo inesperado', { ...validProduct, role: 'admin' }],
]) {
  test(`POST y PUT rechazan ${name} con 400 sin persistir`, async () => {
    const { app, records } = fixture();
    const auth = `Bearer ${signToken()}`;
    await request(app).post('/api/products/create').set('Authorization', auth).send(body).expect(400);
    await request(app).put('/api/products/any-id').set('Authorization', auth).send(body).expect(400);
    assert.equal(records.size, 0);
  });
}

test('descripción es opcional y PUT requiere todos los campos obligatorios', async () => {
  const { app } = fixture();
  const auth = `Bearer ${signToken()}`;
  const response = await request(app).post('/api/products/create').set('Authorization', auth)
    .send({ title: 'Lápiz', category: 'Librería', price: 0 }).expect(201);
  assert.equal(response.body.description, '');
  await request(app).put(`/api/products/${response.body.id}`).set('Authorization', auth).send({ price: 5 }).expect(400);
});

test('GET, PUT y DELETE devuelven 404 si el ID no existe', async () => {
  const { app } = fixture();
  await request(app).get('/api/products/missing-id').expect(404);
  await request(app).put('/api/products/missing-id').set('Authorization', `Bearer ${signToken()}`).send(validProduct).expect(404);
  await request(app).delete('/api/products/missing-id').set('Authorization', `Bearer ${signToken()}`).expect(404);
});

for (const id of ['a%2Fb', '__reserved__', '%00', '%20', '%E0%A4%A', 'x'.repeat(1501)]) {
  test(`un ID inválido (${id.slice(0, 20)}) devuelve 400`, async () => {
    const { app } = fixture();
    await request(app).get(`/api/products/${id}`).expect(400);
    await request(app).put(`/api/products/${id}`).set('Authorization', `Bearer ${signToken()}`).send(validProduct).expect(400);
    await request(app).delete(`/api/products/${id}`).set('Authorization', `Bearer ${signToken()}`).expect(400);
  });
}

test('JSON malformado, JSON primitivo, tamaño excesivo y tipo incorrecto devuelven 400', async () => {
  const { app } = fixture();
  for (const body of ['{"title":', 'null', 'true', '1', JSON.stringify({ title: 'x'.repeat(17000) })]) {
    const response = await request(app).post('/api/products/create').set('Authorization', `Bearer ${signToken()}`)
      .set('Content-Type', 'application/json').send(body).expect(400);
    assert.equal(response.body.error.status, 400);
    assert.ok(!response.text.includes(body));
  }
  await request(app).post('/api/products/create').set('Authorization', `Bearer ${signToken()}`)
    .set('Content-Type', 'text/plain').send('texto').expect(400);
});

test('rutas desconocidas y acciones sin ID devuelven JSON 404', async () => {
  const { app } = fixture();
  for (const [method, path] of [['get', '/desconocida'], ['post', '/api/products'],
    ['delete', '/api/products/'], ['put', '/api/products/'], ['get', '/api/auth/login']]) {
    const response = await request(app)[method](path).expect(404).expect('Content-Type', /json/);
    assert.deepEqual(response.body, { error: { status: 404, message: 'Ruta no encontrada.' } });
  }
});

for (const [method, path, modelMethod] of [
  ['get', '/api/products', 'findAll'], ['get', '/api/products/any-id', 'findById'],
  ['post', '/api/products/create', 'create'], ['put', '/api/products/any-id', 'update'],
  ['delete', '/api/products/any-id', 'remove'],
]) {
  test(`error externo en ${modelMethod} devuelve 500 sin detalles internos`, async () => {
    const marker = randomBytes(20).toString('hex');
    const { app } = fixture({ [modelMethod]: async () => { throw new Error(`private_key=${marker}`); } });
    const response = await request(app)[method](path).set('Authorization', `Bearer ${signToken()}`)
      .send(validProduct).expect(500);
    assert.equal(response.body.error.status, 500);
    assert.ok(!response.text.includes(marker));
    assert.equal(response.body.stack, undefined);
  });
}

test('CORS permite sólo los orígenes configurados y resuelve el preflight', async () => {
  const { app } = fixture();
  await request(app).get('/api/products').set('Origin', testConfig.corsOrigins[0])
    .expect('Access-Control-Allow-Origin', testConfig.corsOrigins[0]).expect(200);
  const blocked = await request(app).get('/api/products').set('Origin', 'https://otro.example').expect(200);
  assert.equal(blocked.headers['access-control-allow-origin'], undefined);
  await request(app).options('/api/products/create').set('Origin', testConfig.corsOrigins[0])
    .set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'authorization,content-type')
    .expect(204).expect('Access-Control-Allow-Headers', /Authorization/);
});
