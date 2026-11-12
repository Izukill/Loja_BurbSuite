import { Router } from 'express';

export function productsRouter(db) {
  const router = Router();

  router.get('/', (req, res, next) => {
    const query = req.query.q ?? '';
    const mode = req.query.modo ?? 'vulneravel';
    if (typeof query !== 'string' || query.length > 200 || !['vulneravel', 'corrigido'].includes(mode)) {
      return res.status(400).json({ erro: 'Informe q com até 200 caracteres e modo vulneravel ou corrigido.' });
    }

    try {
      let products;

      if (mode === 'vulneravel') {

        //modo vulneravel permitando sqlInjection passando a string para a consulta
        const sql = `SELECT id, nome, descricao, preco_centavos FROM produtos
          WHERE publicado = 1 AND nome LIKE '%${query}%'`;
        products = db.prepare(sql).all();
      } else {

        //correção: a entrada é vinculada como dado e não altera a consulta
        products = db.prepare(`SELECT id, nome, descricao, preco_centavos FROM produtos
          WHERE publicado = 1 AND nome LIKE ?`).all(`%${query}%`);
      }
      res.json({ modo: mode, total: products.length, produtos: products });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
