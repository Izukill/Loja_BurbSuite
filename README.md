# Loja Laboratório — Burp Suite

Projeto acadêmico em JavaScript para demonstrar testes manuais com o Burp Suite. A aplicação contém **SQL injection intencional** e deve rodar exclusivamente no computador local, com dados fictícios.

## Executar

Requisito: Node.js 24 ou superior (SQLite nativo via `node:sqlite`). A API SQLite pode emitir aviso de recurso experimental em algumas versões do Node.

```powershell
npm install
npm start
```

Abra http://127.0.0.1:3000. O servidor escuta somente em `127.0.0.1`.

```powershell
npm run dev
npm run db:reset
```

`dev` reinicia o servidor ao editar o código.`db:reset` restaura somente o catálogo fictício; execute com o servidor parado. O arquivo `data/catalogo.sqlite` é criado automaticamente no primeiro início e não deve ser versionado.

### Atualmente:

- Servidor Express e banco SQLite com quatro produtos públicos e um produto não publicado.
- Interface de catálogo, busca e seletor entre busca vulnerável e corrigida.
- Rota `GET /api/produtos?q=...&modo=vulneravel|corrigido`.
- SQL injection reproduzível e correção por consulta parametrizada.
- Roteiro da demonstração e testes HTTP das duas versões.

O seletor muda **somente a implementação da busca**. Não transforma a aplicação inteira em um sistema seguro.

### O que falta:

1. Cadastro/login com armazenamento vulnerável e corrigido de senhas; inspeção local para demonstrar a limitação do teste HTTP.
2. Compra fictícia com preço adulterável e versão corrigida pelo preço do banco.

Essas funcionalidades **ainda não estão implementadas**. Há pontos de integração em `src/app.js`; não existem botões de compra ou login que simulem funcionalidades prontas.

Leia [os contratos](docs/CONTRATOS.md) antes de começar. As tarefas completas estão em [docs/issues/README.md](docs/issues/README.md), prontas para copiar para o GitHub. Não foram publicadas como issues remotas.

## Demonstração

Siga [o roteiro do Burp](docs/DEMONSTRACAO.md). Com a Community, a identificação é manual: Proxy e Repeater não geram automaticamente um relatório de vulnerabilidades.

## Organização

```text
src/app.js                 configuração e integração de rotas
src/server.js              inicialização em loopback
src/database.js            catálogo e dados fictícios
src/routes/products.js     busca vulnerável e corrigida
public/                    interface (única pasta servida por HTTP)
scripts/reset-db.js        restauração do catálogo
test/catalog.test.js       testes HTTP com SQLite em memória
docs/                      contratos, roteiro e issues
```

## Referências

- [Ferramentas do Burp](https://portswigger.net/burp/documentation/desktop/tools)
- [Edições do Burp](https://portswigger.net/burp)
- [SQLite nativo do Node.js](https://nodejs.org/api/sqlite.html)
- [Express](https://expressjs.com/en/starter/installing/)

Ausência de alerta não comprova segurança. Os testes automatizados deste projeto verificam o comportamento didático; não são uma auditoria de segurança completa.
