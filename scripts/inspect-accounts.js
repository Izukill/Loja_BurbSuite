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

  console.log('='.repeat(80));
  console.log('INSPEÇÃO LOCAL DO ARMAZENAMENTO DE CONTAS (data/contas.sqlite)');
  console.log('Este script roda exclusivamente no terminal local para fins didáticos.');
  console.log('Não existe endpoint HTTP que exponha estas informações.');
  console.log('='.repeat(80));

  if (rows.length === 0) {
    console.log(usuarioFicticio
      ? `Nenhuma conta encontrada para o usuário fictício: "${usuarioFicticio}".`
      : 'Nenhuma conta cadastrada no momento.');
  } else {
    for (const row of rows) {
      console.log(`\n[ID: ${row.id}] Usuário: ${row.usuario} | Modo: ${row.modo.toUpperCase()}`);
      console.log(`Data de criação: ${row.criado_em}`);
      if (row.modo === 'vulneravel') {
        console.log(` SENHA ARMAZENADA (TEXTO PURO - VULNERÁVEL): "${row.senha_armazenada}"`);
        console.log(' Falha: Senha salva diretamente sem salt ou derivação de chave.');
      } else {
        console.log(` HASH SEGURO (SCRYPT COM SALT ALEATÓRIO):`);
        console.log(`   ${row.senha_armazenada}`);
        console.log(' Protegido: A senha original não pode ser revertida a partir do hash.');
      }
    }
  }
  console.log('\n' + '='.repeat(80));
} finally {
  accountsDb.close();
}
