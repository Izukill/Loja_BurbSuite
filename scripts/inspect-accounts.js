import { createAccountsDatabase } from '../src/accountsDatabase.js';

const usuarioFicticio = process.argv[2];
const accountsDb = createAccountsDatabase();

try {
  let query = 'SELECT id, usuario, modo, senha_armazenada, criado_em FROM contas';
  const params = [];

  if (usuarioFicticio) {
    query += ' WHERE usuario = ?';
    params.push(usuarioFicticio);
  }

  query += ' ORDER BY id ASC';

  const rows = accountsDb.prepare(query).all(...params);

  if (rows.length === 0) {
    console.log(usuarioFicticio
      ? `Nenhuma conta encontrada para o usuario: "${usuarioFicticio}".`
      : 'Tabela contas esta vazia.');
  } else {
    console.table(rows);
  }
} finally {
  accountsDb.close();
}
