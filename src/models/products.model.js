function serialize(document) {
  return { ...document.data(), id: document.id };
}

export function createProductsModel(db) {
  const products = db.collection('products');
  return {
    async findAll() {
      const snapshot = await products.get();
      return snapshot.docs.map(serialize);
    },
    async findById(id) {
      const document = await products.doc(id).get();
      return document.exists ? serialize(document) : null;
    },
    async create(data) {
      const document = await products.add(data);
      return { ...data, id: document.id };
    },
    async update(id, data) {
      try {
        await products.doc(id).update(data);
        return { ...data, id };
      } catch (error) {
        if (error.code === 5) return null; // gRPC NOT_FOUND
        throw error;
      }
    },
    async remove(id) {
      const reference = products.doc(id);
      // La transacción distingue un documento ausente y evita una carrera con DELETE.
      return db.runTransaction(async transaction => {
        const document = await transaction.get(reference);
        if (!document.exists) return false;
        transaction.delete(reference);
        return true;
      });
    },
  };
}
