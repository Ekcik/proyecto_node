export function createProductsController(service) {
  return {
    async list(req, res) {
      res.json(await service.list());
    },
    async get(req, res) {
      res.json(await service.get(req.params.id));
    },
    async create(req, res) {
      const product = await service.create(req.body);
      res.location(`/api/products/${encodeURIComponent(product.id)}`).status(201).json(product);
    },
    async update(req, res) {
      res.json(await service.update(req.params.id, req.body));
    },
    async remove(req, res) {
      await service.remove(req.params.id);
      res.status(204).end();
    },
  };
}
