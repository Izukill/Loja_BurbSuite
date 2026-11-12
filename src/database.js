import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';

export const databasePath = new URL('../data/catalogo.sqlite', import.meta.url);

export function createDatabase(path = databasePath) {
  if (path === databasePath) mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  const db = new DatabaseSync(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT NOT NULL,
      preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
      publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0, 1))
    );
  `);

  seedDatabase(db);
  return db;
}

export function seedDatabase(db) {
  const insert = db.prepare(`INSERT OR IGNORE INTO produtos
    (id, nome, descricao, preco_centavos, publicado) VALUES (?, ?, ?, ?, ?)`);

  const products = [
    [1, 'Teclado Aurora', 'Teclado compacto para sua mesa de estudos.', 15990, 1],
    [2, 'Mouse Orbital', 'Precisão e conforto para o dia a dia.', 8990, 1],
    [3, 'Headset Eclipse', 'Áudio para acompanhar suas próximas ideias.', 22990, 1],
    [4, 'Caderno Pixel', 'Espaço para projetos, desenhos e descobertas.', 2990, 1],
    [5, 'Protótipo confidencial', 'Produto fictício ainda não publicado no catálogo.', 99900, 0]
  ];
  
  for (const product of products) insert.run(...product);
}
