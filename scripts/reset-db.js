import { createDatabase, seedDatabase } from '../src/database.js';

//comandos pro reset do db
const db = createDatabase();

db.exec('BEGIN');
try {
  db.exec('DELETE FROM produtos');
  
  seedDatabase(db);
  db.exec('COMMIT');

  console.log('Catálogo fictício restaurado. Contas e compras não são alteradas.');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;

} finally {

  db.close();
}
