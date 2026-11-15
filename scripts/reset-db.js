import { createDatabase, seedDatabase } from '../src/database.js';
import { createAccountsDatabase } from '../src/accountsDatabase.js';

const db = createDatabase();

db.exec('BEGIN');
try {
  db.exec('DELETE FROM produtos');
  
  seedDatabase(db);
  db.exec('COMMIT');

  console.log('Catálogo fictício restaurado. Compras simuladas não são persistidas.');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}

if (process.argv.includes('--all') || process.argv.includes('--contas')) {
  const accountsDb = createAccountsDatabase();
  try {
    accountsDb.exec('DELETE FROM contas');
    console.log('Tabela de contas fictícias limpa com sucesso.');
  } finally {
    accountsDb.close();
  }
}

