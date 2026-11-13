import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { loadConfig } from '../src/config/env.js';
import { testConfig } from './helpers.js';

const environment = {
  FIREBASE_PROJECT_ID: 'techlab-test-project',
  GOOGLE_APPLICATION_CREDENTIALS: '/not-a-real-credential-file.json',
  ADMIN_USERNAME: testConfig.adminUsername,
  ADMIN_PASSWORD_HASH: testConfig.adminPasswordHash,
  JWT_SECRET: randomBytes(32).toString('hex'),
};

test('configuración válida utiliza puerto y vencimiento predeterminados', () => {
  const config = loadConfig(environment);
  assert.equal(config.port, 3000);
  assert.equal(config.jwtExpiresIn, 3600);
  assert.equal(config.jwtSecret.length, 32);
  assert.deepEqual(config.corsOrigins, []);
});

for (const name of Object.keys(environment)) {
  test(`el arranque exige ${name}`, () => {
    assert.throws(() => loadConfig({ ...environment, [name]: '' }), new RegExp(name));
  });
}

for (const [name, value] of [
  ['PORT', '0'], ['PORT', '65536'], ['PORT', 'abc'], ['PORT', '3.5'],
  ['JWT_EXPIRES_IN_SECONDS', '0'], ['JWT_EXPIRES_IN_SECONDS', '1h'], ['JWT_EXPIRES_IN_SECONDS', '86401'],
  ['JWT_SECRET', 'short'], ['JWT_SECRET', 'z'.repeat(64)],
  ['ADMIN_PASSWORD_HASH', 'plaintext'], ['ADMIN_USERNAME', 'x'.repeat(101)],
  ['FIREBASE_PROJECT_ID', 'invalid/project'],
  ['CORS_ORIGINS', '*'], ['CORS_ORIGINS', 'ftp://localhost'], ['CORS_ORIGINS', 'https://example.com/path'],
  ['FIRESTORE_EMULATOR_HOST', 'localhost:8080'],
]) {
  test(`configuración rechaza ${name} inválido (${value.slice(0, 30)})`, () => {
    assert.throws(() => loadConfig({ ...environment, [name]: value }));
  });
}

test('configuración acepta valores personalizados y varios orígenes', () => {
  const config = loadConfig({ ...environment, PORT: '8080', JWT_EXPIRES_IN_SECONDS: '600', CORS_ORIGINS: 'http://localhost:5173, https://example.com' });
  assert.equal(config.port, 8080);
  assert.equal(config.jwtExpiresIn, 600);
  assert.deepEqual(config.corsOrigins, ['http://localhost:5173', 'https://example.com']);
});

test('index.js falla sin configuración y no abre el servidor ni expone valores', () => {
  const marker = randomBytes(16).toString('hex');
  const result = spawnSync(process.execPath, ['index.js'], {
    encoding: 'utf8', timeout: 10000,
    env: { ...process.env, FIREBASE_PROJECT_ID: '', JWT_SECRET: marker },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No se pudo iniciar la API/);
  assert.ok(!result.stderr.includes(marker));
  assert.ok(!result.stdout.includes('API disponible'));
});
