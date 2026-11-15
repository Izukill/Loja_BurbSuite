import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../src/app.js';
import { seedDatabase } from '../src/database.js';
import { accountsRouter } from '../src/routes/accounts.js';

function createTestDatabases() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE produtos (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT NOT NULL,
      preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
      publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0, 1))
    );
  `);
  seedDatabase(db);

  const accountsDb = new DatabaseSync(':memory:');
  accountsDb.exec(`
    CREATE TABLE contas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL,
      modo TEXT NOT NULL CHECK (modo IN ('vulneravel', 'corrigido')),
      senha_armazenada TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (usuario, modo)
    );
  `);

  return { db, accountsDb };
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(res))
      });
    });
  });
}

test('Catálogo e Busca: modo vulnerável e corrigido', async (t) => {
  const { db, accountsDb } = createTestDatabases();
  const app = createApp(db, accountsDb);
  const server = await startServer(app);

  t.after(async () => {
    await server.close();
    db.close();
    accountsDb.close();
  });

  await t.test('Busca normal por "Teclado"', async () => {
    const res = await fetch(`${server.url}/api/produtos?q=Teclado&modo=corrigido`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 1);
    assert.equal(data.produtos[0].nome, 'Teclado Aurora');
  });

  await t.test('SQLi funciona no modo vulnerável (exibe protótipo não publicado)', async () => {
    const res = await fetch(`${server.url}/api/produtos?q=%27%20OR%201%3D1%20--%20&modo=vulneravel`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 5);
  });

  await t.test('Modo corrigido bloqueia SQLi', async () => {
    const res = await fetch(`${server.url}/api/produtos?q=%27%20OR%201%3D1%20--%20&modo=corrigido`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 0);
  });

  await t.test('Catálogo não consegue acessar tabela de contas (isolamento)', async () => {
    // Tentativa de ler tabela contas via SQLi no catálogo
    const res = await fetch(`${server.url}/api/produtos?q=%27%20UNION%20SELECT%201%2Cusuario%2Csenha_armazenada%2C100%20FROM%20contas%20--%20&modo=vulneravel`);
    // A tabela 'contas' não existe na conexão SQLite do catálogo! Deve retornar erro 500 do SQLite (no such table)
    assert.equal(res.status, 500);
  });
});

test('Compras: validação e adulteração de preço', async (t) => {
  const { db, accountsDb } = createTestDatabases();
  const app = createApp(db, accountsDb);
  const server = await startServer(app);

  t.after(async () => {
    await server.close();
    db.close();
    accountsDb.close();
  });

  await t.test('Modo vulnerável aceita preço adulterado pelo cliente', async () => {
    const res = await fetch(`${server.url}/api/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        produtoId: 1,
        quantidade: 1,
        precoUnitarioCentavos: 100,
        modo: 'vulneravel'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.totalCentavos, 100);
  });

  await t.test('Modo corrigido ignora preço enviado e busca do banco', async () => {
    const res = await fetch(`${server.url}/api/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        produtoId: 1,
        quantidade: 1,
        precoUnitarioCentavos: 100,
        modo: 'corrigido'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.totalCentavos, 15990);
  });
});

test('Contas e Armazenamento: cadastro, login, integridade e isolamento de modos', async (t) => {
  const { db, accountsDb } = createTestDatabases();
  const app = createApp(db, accountsDb);
  const server = await startServer(app);

  t.after(async () => {
    await server.close();
    db.close();
    accountsDb.close();
  });

  await t.test('Cadastro modo vulnerável: sucesso 201 e resposta sem senha', async () => {
    const res = await fetch(`${server.url}/api/contas/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'aluno-vulneravel',
        senha: 'senha-super-secreta',
        modo: 'vulneravel'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.usuario, 'aluno-vulneravel');
    assert.equal(data.modo, 'vulneravel');
    assert.equal(data.senha, undefined);
    assert.equal(data.salt, undefined);
    assert.equal(data.hash, undefined);
    assert.equal(data.senha_armazenada, undefined);

    // Inspeciona no banco se salvou em texto puro
    const row = accountsDb.prepare('SELECT * FROM contas WHERE usuario = ? AND modo = ?').get('aluno-vulneravel', 'vulneravel');
    assert.ok(row);
    assert.equal(row.senha_armazenada, 'senha-super-secreta');
  });

  await t.test('Cadastro modo corrigido: sucesso 201, resposta sem senha e hash scrypt com salt', async () => {
    const res = await fetch(`${server.url}/api/contas/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'aluno-corrigido-1',
        senha: 'senha-super-secreta',
        modo: 'corrigido'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.usuario, 'aluno-corrigido-1');
    assert.equal(data.modo, 'corrigido');
    assert.equal(data.senha, undefined);
    assert.equal(data.salt, undefined);
    assert.equal(data.hash, undefined);
    assert.equal(data.senha_armazenada, undefined);

    // Inspeciona no banco se salvou scrypt
    const row = accountsDb.prepare('SELECT * FROM contas WHERE usuario = ? AND modo = ?').get('aluno-corrigido-1', 'corrigido');
    assert.ok(row);
    assert.notEqual(row.senha_armazenada, 'senha-super-secreta');
    assert.ok(row.senha_armazenada.startsWith('$scrypt$'));
  });

  await t.test('Dois usuários com a mesma senha no modo corrigido possuem hashes diferentes (salts únicos)', async () => {
    const res = await fetch(`${server.url}/api/contas/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'aluno-corrigido-2',
        senha: 'senha-super-secreta', // mesma senha de aluno-corrigido-1
        modo: 'corrigido'
      })
    });
    assert.equal(res.status, 201);

    const row1 = accountsDb.prepare('SELECT senha_armazenada FROM contas WHERE usuario = ? AND modo = ?').get('aluno-corrigido-1', 'corrigido');
    const row2 = accountsDb.prepare('SELECT senha_armazenada FROM contas WHERE usuario = ? AND modo = ?').get('aluno-corrigido-2', 'corrigido');

    assert.notEqual(row1.senha_armazenada, row2.senha_armazenada);
  });

  await t.test('Rejeita usuário duplicado no mesmo modo (409 Conflict)', async () => {
    const res = await fetch(`${server.url}/api/contas/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'aluno-vulneravel',
        senha: 'outra-senha',
        modo: 'vulneravel'
      })
    });
    assert.equal(res.status, 409);
    const data = await res.json();
    assert.match(data.erro, /já cadastrado/i);
  });

  await t.test('Isolamento de modos: mesmo nome de usuário pode existir em modos diferentes', async () => {
    // cadastrar aluno-vulneravel no modo corrigido
    const res = await fetch(`${server.url}/api/contas/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'aluno-vulneravel',
        senha: 'outra-senha',
        modo: 'corrigido'
      })
    });
    assert.equal(res.status, 201);
  });

  await t.test('Validação de entradas no cadastro: rejeita vazios, tipos incorretos ou tamanhos excessivos', async () => {
    const invalidInputs = [
      {},
      { usuario: '', senha: '123' },
      { usuario: 'abc', senha: '' },
      { usuario: 'a'.repeat(51), senha: '123' },
      { usuario: 'abc', senha: 'a'.repeat(129) },
      { usuario: 'abc', senha: '123', modo: 'invalido' }
    ];

    for (const body of invalidInputs) {
      const res = await fetch(`${server.url}/api/contas/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      assert.equal(res.status, 400);
    }
  });

  await t.test('Login modo vulnerável: credenciais válidas e inválidas', async () => {
    // Válido
    const resValid = await fetch(`${server.url}/api/contas/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'aluno-vulneravel',
        senha: 'senha-super-secreta',
        modo: 'vulneravel'
      })
    });
    assert.equal(resValid.status, 200);
    const dataValid = await resValid.json();
    assert.equal(dataValid.usuario, 'aluno-vulneravel');
    assert.equal(dataValid.modo, 'vulneravel');
    assert.equal(dataValid.senha, undefined);
    assert.equal(dataValid.senha_armazenada, undefined);

    // Senha errada
    const resInvalidPass = await fetch(`${server.url}/api/contas/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'aluno-vulneravel',
        senha: 'senha-errada',
        modo: 'vulneravel'
      })
    });
    assert.equal(resInvalidPass.status, 401);

    // Usuário não existente no modo
    const resNoUser = await fetch(`${server.url}/api/contas/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'nao-existe',
        senha: 'qualquer',
        modo: 'vulneravel'
      })
    });
    assert.equal(resNoUser.status, 401);
  });

  await t.test('Login modo corrigido: credenciais válidas e inválidas', async () => {
    // Válido
    const resValid = await fetch(`${server.url}/api/contas/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'aluno-corrigido-1',
        senha: 'senha-super-secreta',
        modo: 'corrigido'
      })
    });
    assert.equal(resValid.status, 200);
    const dataValid = await resValid.json();
    assert.equal(dataValid.usuario, 'aluno-corrigido-1');
    assert.equal(dataValid.modo, 'corrigido');
    assert.equal(dataValid.senha, undefined);
    assert.equal(dataValid.salt, undefined);
    assert.equal(dataValid.hash, undefined);

    // Senha errada
    const resInvalidPass = await fetch(`${server.url}/api/contas/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'aluno-corrigido-1',
        senha: 'senha-incorreta',
        modo: 'corrigido'
      })
    });
    assert.equal(resInvalidPass.status, 401);
  });
});
