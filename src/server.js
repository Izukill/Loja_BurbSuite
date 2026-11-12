import { createDatabase } from './database.js';
import { createApp } from './app.js';

const db = createDatabase();

const server = createApp(db).listen(3000, '127.0.0.1', () => {
  console.log('Loja Laboratório: http://127.0.0.1:3000');
  console.log('Ambiente com vulnerabilidade intencional iniciado.');
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? 'A porta 3000 já está em uso.' : error.message);
  db.close();
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
