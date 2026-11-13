import { HttpError } from '../utils/http-error.js';

export function notFound(req, res, next) {
  next(new HttpError(404, 'Ruta no encontrada.'));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = 500;
  let message = 'Ocurrió un error interno. Intentá nuevamente más tarde.';
  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
  } else if (['entity.parse.failed', 'entity.too.large', 'encoding.unsupported', 'charset.unsupported', 'request.aborted', 'request.size.invalid'].includes(error.type)
    || error instanceof URIError) {
    status = 400;
    message = 'El cuerpo JSON o la URL no son válidos, o exceden el límite permitido.';
  }
  if (status === 401) res.set('WWW-Authenticate', 'Bearer');
  res.status(status).json({ error: { status, message } });
}
