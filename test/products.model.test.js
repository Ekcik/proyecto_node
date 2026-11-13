import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createProductsModel } from '../src/models/products.model.js';

function firestoreStub({ exists = true, updateError, transactionError } = {}) {
  const data = { title: 'Cuaderno', price: 100, category: 'Librería', description: '', id: 'campo-que-no-es-el-id' };
  const document = { id: 'firestore-document-id', exists, data: () => data };
  const reference = {
    get: mock.fn(async () => document),
    update: mock.fn(async () => { if (updateError) throw updateError; }),
  };
  const collection = {
    get: mock.fn(async () => ({ docs: [document] })),
    doc: mock.fn(() => reference),
    add: mock.fn(async () => ({ id: document.id })),
  };
  const transaction = { get: mock.fn(async () => document), delete: mock.fn() };
  const db = {
    collection: mock.fn(() => collection),
    runTransaction: mock.fn(async callback => {
      if (transactionError) throw transactionError;
      return callback(transaction);
    }),
  };
  return { model: createProductsModel(db), db, collection, reference, transaction, data, document };
}

test('el modelo lee products y usa el ID del documento por encima de un campo id', async () => {
  const { model, db, document } = firestoreStub();
  assert.equal(db.collection.mock.calls[0].arguments[0], 'products');
  assert.equal((await model.findAll())[0].id, document.id);
  assert.equal((await model.findById(document.id)).id, document.id);
});

test('findById devuelve null cuando el documento no existe', async () => {
  assert.equal(await firestoreStub({ exists: false }).model.findById('missing'), null);
});

test('crear usa add y conserva el ID generado por Firestore', async () => {
  const { model, collection, document } = firestoreStub();
  const input = { title: 'Lápiz', price: 0, category: 'Librería', description: '' };
  const result = await model.create(input);
  assert.deepEqual(collection.add.mock.calls[0].arguments, [input]);
  assert.deepEqual(result, { ...input, id: document.id });
});

test('actualizar usa update y no set con creación implícita', async () => {
  const { model, reference } = firestoreStub();
  const input = { title: 'Actualizado', price: 2, category: 'Otra', description: '' };
  assert.deepEqual(await model.update('existing-id', input), { ...input, id: 'existing-id' });
  assert.deepEqual(reference.update.mock.calls[0].arguments, [input]);
});

test('actualizar un documento ausente devuelve null; otros errores se propagan', async () => {
  assert.equal(await firestoreStub({ updateError: { code: 5 } }).model.update('missing', {}), null);
  const unavailable = Object.assign(new Error('Servicio no disponible'), { code: 14 });
  await assert.rejects(firestoreStub({ updateError: unavailable }).model.update('any', {}), error => error === unavailable);
});

test('DELETE usa una transacción y devuelve false sin borrar un documento ausente', async () => {
  const existing = firestoreStub();
  assert.equal(await existing.model.remove('existing'), true);
  assert.equal(existing.db.runTransaction.mock.callCount(), 1);
  assert.deepEqual(existing.transaction.delete.mock.calls[0].arguments, [existing.reference]);
  const missing = firestoreStub({ exists: false });
  assert.equal(await missing.model.remove('missing'), false);
  assert.equal(missing.transaction.delete.mock.callCount(), 0);
});

test('los errores de transacción se propagan al manejo centralizado', async () => {
  const unavailable = new Error('Servicio no disponible');
  await assert.rejects(firestoreStub({ transactionError: unavailable }).model.remove('any'), error => error === unavailable);
});
