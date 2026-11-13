import { HttpError } from '../utils/http-error.js';

export function validateProductId(id) {
  // Firestore usa identificadores de texto; no se convierten a números.
  if (typeof id !== 'string' || !id.trim() || id === '.' || id === '..'
    || /^__.*__$/.test(id) || /[\/\x00-\x1f\x7f]/.test(id) || Buffer.byteLength(id, 'utf8') > 1500) {
    throw new HttpError(400, 'El ID del producto no es válido.');
  }
  return id;
}

export function validateProduct(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'El cuerpo debe ser un objeto JSON.');
  }
  const allowed = ['title', 'price', 'category', 'description'];
  if (Object.keys(body).some(key => !allowed.includes(key))) {
    throw new HttpError(400, 'Se enviaron campos no permitidos.');
  }
  for (const [field, max] of [['title', 150], ['category', 80]]) {
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > max) {
      throw new HttpError(400, `${field} es obligatorio y debe tener entre 1 y ${max} caracteres.`);
    }
  }
  if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0 || body.price > 1000000000) {
    throw new HttpError(400, 'price debe ser un número entre 0 y 1000000000.');
  }
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) {
    throw new HttpError(400, 'description debe ser un texto de hasta 2000 caracteres.');
  }
  return {
    title: body.title.trim(),
    price: body.price,
    category: body.category.trim(),
    description: (body.description ?? '').trim(),
  };
}
