import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { hashPassword, isPasswordHash, verifyPassword } from '../src/utils/password.js';

test('scrypt usa una sal distinta y verifica sin almacenar texto plano', async () => {
  const password = randomBytes(24).toString('hex');
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.ok(isPasswordHash(first));
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(randomBytes(24).toString('hex'), first), false);
  assert.equal(await verifyPassword(password, 'invalid'), false);
  assert.equal(await verifyPassword('x'.repeat(129), first), false);
});

test('la generación rechaza contraseñas fuera de los límites', async () => {
  await assert.rejects(hashPassword('x'.repeat(11)));
  await assert.rejects(hashPassword('x'.repeat(129)));
  await assert.rejects(hashPassword(null));
});

test('el generador rechaza una entrada sin terminal interactiva', () => {
  const result = spawnSync(process.execPath, ['scripts/hash-password.js'], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /terminal interactiva/);
  assert.ok(!result.stdout.includes('ADMIN_PASSWORD_HASH='));
});

for (const matching of [true, false]) {
  test(`generador con terminal simulada: ${matching ? 'oculta la entrada y produce un hash válido' : 'rechaza confirmación distinta'}`, { timeout: 10000 }, async t => {
    const password = randomBytes(24).toString('hex');
    const confirmation = matching ? password : randomBytes(24).toString('hex');
    // Simula las teclas de una terminal; no comprueba la integración con la consola del SO.
    const bootstrap = "Object.defineProperty(process.stdin, 'isTTY', { value: true }); process.stdin.setRawMode = () => process.stdin; await import('./scripts/hash-password.js');";
    const child = spawn(process.execPath, ['--input-type=module', '-e', bootstrap], { stdio: ['pipe', 'pipe', 'pipe'] });
    t.after(() => child.kill());
    let output = '';
    let errors = '';
    let firstSent = false;
    let secondSent = false;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { errors += chunk; });
    child.stdout.on('data', chunk => {
      output += chunk;
      if (!firstSent && output.includes('entrada oculta')) {
        firstSent = true;
        child.stdin.write(`${password}\n`);
      }
      if (!secondSent && output.includes('Repetí')) {
        secondSent = true;
        child.stdin.write(`${confirmation}\n`);
      }
    });
    const [code] = await once(child, 'close');
    assert.ok(!output.includes(password));
    assert.ok(!errors.includes(password));
    if (matching) {
      assert.equal(code, 0);
      const hash = /ADMIN_PASSWORD_HASH=(scrypt:[a-f0-9]+:[a-f0-9]+)/.exec(output)?.[1];
      assert.ok(isPasswordHash(hash));
      assert.equal(await verifyPassword(password, hash), true);
    } else {
      assert.equal(code, 1);
      assert.match(errors, /no coinciden/);
      assert.ok(!output.includes('ADMIN_PASSWORD_HASH='));
    }
  });
}
