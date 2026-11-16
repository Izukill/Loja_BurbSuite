import { Router } from 'express';

export function ordersRouter(db) {
  const router = Router();
  const findProduct = db.prepare(`
    SELECT id, preco_reais FROM produtos WHERE id = ? AND publicado = 1
  `);

  router.post('/', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ erro: 'Envie os dados da compra em um objeto JSON.' });
    }

    const { produtoId, quantidade, precoUnitarioReais, modo = 'vulneravel' } = body;
    if (!['vulneravel', 'corrigido'].includes(modo)) {
      return res.status(400).json({ erro: 'Modo deve ser vulneravel ou corrigido.' });
    }
    if (!Number.isSafeInteger(produtoId) || produtoId < 1) {
      return res.status(400).json({ erro: 'Produto deve ter um identificador inteiro positivo.' });
    }
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10) {
      return res.status(400).json({ erro: 'Quantidade deve ser um inteiro de 1 a 10.' });
    }

    const product = findProduct.get(produtoId);
    if (!product) {
      return res.status(404).json({ erro: 'Produto não encontrado ou não publicado.' });
    }

    let price;

    if (modo === 'vulneravel') {
      // no modo vulneravel o preco enviado pelo cliente e aceito
      price = Number(precoUnitarioReais);
    } else {
      // correcao: ignora completamente o preco enviado pelo cliente e usa o preco oficial do produto
      price = Number(product.preco_reais);
    }

    if (typeof price !== 'number' || Number.isNaN(price) || price <= 0 || !Number.isFinite(price) || price > 1000000) {
      return res.status(400).json({ erro: 'Preço deve ser um número positivo em reais dentro do limite.' });
    }

    const totalReais = Math.round(price * quantidade * 100) / 100;

    return res.status(201).json({
      produtoId,
      quantidade,
      precoUnitarioReais: price,
      totalReais,
      modo,
      simulacao: true
    });
  });

  return router;
}
