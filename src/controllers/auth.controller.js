export function createAuthController(service) {
  return {
    async login(req, res) {
      res.set('Cache-Control', 'no-store');
      res.json(await service.login(req.body));
    },
  };
}
