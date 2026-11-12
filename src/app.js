import express from 'express';
import { fileURLToPath } from 'node:url';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ambiente: 'laboratorio-local' }));
  app.use('/api/produtos', productsRouter(db));
  app.use('/api/compras', ordersRouter(db));


  app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url))));
  app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

  app.use((error, _req, res, _next) => {
    const invalidBody = error.type === 'entity.parse.failed';

    const tooLarge = error.type === 'entity.too.large';

    res.status(invalidBody ? 400 : tooLarge ? 413 : 500).json({
      erro: invalidBody ? 'JSON inválido.' : tooLarge ? 'Requisição muito grande.' : 'Não foi possível executar a operação.'
    });
  });

  return app;
}
