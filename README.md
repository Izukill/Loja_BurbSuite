# Loja Laboratório — Burp Suite

Projeto acadêmico em JavaScript para demonstrar testes manuais com o Burp Suite. A aplicação contém **SQL injection e confiança no preço do cliente intencionais** e deve rodar exclusivamente no computador local, com dados fictícios.

## Executar

Requisito: Node.js 24 ou superior (SQLite nativo via `node:sqlite`). A API SQLite pode emitir aviso de recurso experimental em algumas versões do Node. Além do Burb Suite para conseguir testar as vulnerabilidades

```powershell
npm install
npm start
```

Abra http://127.0.0.1:3000. O servidor escuta somente em `127.0.0.1`.

```powershell
npm run dev
npm run db:reset
npm run accounts:inspect
npm run accounts:reset
```

`dev` reinicia o servidor ao editar o código. `db:reset` restaura somente o catálogo fictício; use `npm run accounts:reset` para limpar contas fictícias salvas em `data/contas.sqlite`. `accounts:inspect [usuario]` permite inspecionar o armazenamento local de contas sem expor nada via HTTP. Os arquivos `data/*.sqlite` são criados automaticamente e não são versionados.

### Funcionalidades implementadas:

- Servidor Express e banco SQLite com catálogo de produtos e isolamento completo entre banco de catálogo (`catalogo.sqlite`) e banco de contas (`contas.sqlite`).
- Interface com catálogo, busca, compras simuladas e área de gerenciamento de contas.
- Rota `GET /api/produtos?q=...&modo=vulneravel|corrigido` (SQL injection intencional e correção parametrizada).
- Compra fictícia por `POST /api/compras` com seletor de preço vulnerável (cliente) vs. corrigido (banco).
- Cadastro e login em `POST /api/contas/cadastro` e `POST /api/contas/login` com dois modos de armazenamento:
  - **Modo vulnerável:** senha fictícia persistida em texto puro no banco de dados.
  - **Modo corrigido:** derivação de chave criptográfica segura via `scrypt` (`node:crypto`), salt criptográfico aleatório por senha e parâmetros (`N`, `r`, `p`, `k`) preservados para verificação em tempo constante (`timingSafeEqual`).
- Respostas HTTP limpas e seguras: jamais retornam senhas, salts ou hashes nas respostas ou logs.
- Script CLI de auditoria/inspeção local (`scripts/inspect-accounts.js`) para demonstrar como o armazenamento difere nos dois modos sem criar endpoints HTTP.
- Suíte de testes automatizados completa (`npm test`) cobrindo produtos, compras e todas as regras de negócio de contas.

Cada seletor muda **somente seu respectivo módulo** (busca, compra ou contas). Não transforma a aplicação inteira em um sistema seguro.

### Contratos da API de Contas

- `POST /api/contas/cadastro`:
  - Enviar: `{ "usuario": "aluno-demo", "senha": "senha-ficticia", "modo": "vulneravel" | "corrigido" }`
  - Resposta (201 Created): `{ "mensagem": "Conta cadastrada com sucesso.", "usuario": "aluno-demo", "modo": "vulneravel" }` (sem senhas, salts ou hashes).
  - Trata duplicidade (409 Conflict) e entradas inválidas/tamanhos excedidos (400 Bad Request).
- `POST /api/contas/login`:
  - Enviar: `{ "usuario": "aluno-demo", "senha": "senha-ficticia", "modo": "vulneravel" | "corrigido" }`
  - Resposta (200 OK): `{ "mensagem": "Autenticação realizada com sucesso.", "usuario": "aluno-demo", "modo": "vulneravel" }` em caso de sucesso; 401 Unauthorized com `{ "erro": "Credenciais inválidas." }` em caso de falha.
  - As consultas usam queries parametrizadas em ambos os modos. Esta etapa não cria nem finge conceder sessões HTTP.

### Contrato da compra

Enviar JSON com `Content-Type: application/json` para `POST /api/compras`:

```json
{"produtoId":1,"quantidade":1,"precoUnitarioReais":159.90,"modo":"vulneravel"}
```

Sucesso: status 201 e `{ "produtoId": 1, "quantidade": 1, "precoUnitarioReais": 159.90, "totalReais": 159.90, "modo": "vulneravel", "simulacao": true }`.

`modo` aceita `vulneravel` (padrão) ou `corrigido`. Na versão vulnerável, o preço enviado em reais pelo cliente é aceito. Na corrigida, ele é ignorado e o valor oficial do catálogo é utilizado. As duas versões exigem produto publicado/existente e quantidade inteira de 1 a 10. Entradas inválidas retornam 400; produto inexistente/não publicado, 404.

## Demonstração

Siga o [passo a passo para verificar projeto com Burp](docs/DEMONSTRACAO.md). Com a Community, a identificação é manual: Proxy e Repeater não geram automaticamente um relatório de vulnerabilidades.

## Organização

```text
src/app.js                   configuração e integração de rotas
src/server.js                inicialização em loopback
src/database.js              catálogo e dados fictícios (catalogo.sqlite)
src/accountsDatabase.js      armazenamento isolado de contas e scrypt (contas.sqlite)
src/routes/products.js       busca vulnerável e corrigida
src/routes/orders.js         compra simulada vulnerável e corrigida
src/routes/accounts.js       cadastro e login vulnerável e corrigido
public/                      interface (HTML/CSS/JS servidos por HTTP)
scripts/reset-db.js          restauração do catálogo e contas
scripts/inspect-accounts.js  inspeção local de armazenamento de senhas
test/                        testes automatizados com Node.js test runner
docs/                        contratos e roteiro da demonstração
```

## Referências

- [Ferramentas do Burp](https://portswigger.net/burp/documentation/desktop/tools)
- [Edições do Burp](https://portswigger.net/burp)
- [SQLite nativo do Node.js](https://nodejs.org/api/sqlite.html)
- [Express](https://expressjs.com/en/starter/installing/)
