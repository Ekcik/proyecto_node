import { HttpError } from '../utils/http-error.js';
import { validateProduct, validateProductId } from '../validators/products.validator.js';

function requireProduct(product) {
  if (!product) throw new HttpError(404, 'Producto no encontrado.');
  return product;
}

export function createProductsService(model) {
  return {
    list: () => model.findAll(),
    async get(id) {
      return requireProduct(await model.findById(validateProductId(id)));
    },
    create: body => model.create(validateProduct(body)),
    async update(id, body) {
      validateProductId(id);
      return requireProduct(await model.update(id, validateProduct(body)));
    },
    async remove(id) {
      requireProduct(await model.remove(validateProductId(id)));
    },
  };
}
