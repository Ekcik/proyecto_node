import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
import { hashPassword } from '../src/utils/password.js';

if (!process.stdin.isTTY) {
  console.error('Ejecutá este comando en una terminal interactiva para ocultar la contraseña.');
  process.exitCode = 1;
} else {
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const terminal = createInterface({ input: process.stdin, output, terminal: true });
  try {
    process.stdout.write('Contraseña del administrador (12 a 128 caracteres, entrada oculta): ');
    muted = true;
    const password = await terminal.question('');
    process.stdout.write('\nRepetí la contraseña: ');
    const confirmation = await terminal.question('');
    process.stdout.write('\n');
    if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
    const hash = await hashPassword(password);
    process.stdout.write(`Copiá esta línea a tu archivo .env:\nADMIN_PASSWORD_HASH=${hash}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    terminal.close();
  }
}
