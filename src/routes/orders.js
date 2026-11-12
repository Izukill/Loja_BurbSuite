import { Router } from 'express';

export function ordersRouter(db) {
  const router = Router();
  const findProduct = db.prepare(`
    SELECT id, preco_centavos FROM produtos WHERE id = ? AND publicado = 1
  `);

  router.post('/', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ erro: 'Envie os dados da compra em um objeto JSON.' });
    }

    const { produtoId, quantidade, precoUnitarioCentavos, modo = 'vulneravel' } = body;
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
      //no modo vulneravel o preço enviado pelo cliente é aceito.
      //validar tipo e limites não garante que este seja o preço oficial.
      price = precoUnitarioCentavos;
    } else {
      //correção: ignora completamente o preço enviado pelo cliente e usa o preço oficial do produto.
      price = product.preco_centavos;
    }

    if (!Number.isSafeInteger(price) || price < 1 ||
        price > Math.floor(Number.MAX_SAFE_INTEGER / quantidade)) {
      return res.status(400).json({ erro: 'Preço deve ser um inteiro positivo em centavos, com total dentro do limite numérico.' });
    }

    return res.status(201).json({
      produtoId,
      quantidade,
      totalCentavos: price * quantidade,
      modo,
      simulacao: true
    });
  });

  return router;
}
