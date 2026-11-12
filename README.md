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
```

`dev` reinicia o servidor ao editar o código.`db:reset` restaura somente o catálogo fictício; execute com o servidor parado. O arquivo `data/catalogo.sqlite` é criado automaticamente no primeiro início e não deve ser versionado.

### Atualmente:

- Servidor Express e banco SQLite com quatro produtos públicos e um produto não publicado.
- Interface de catálogo, busca e seletor entre busca vulnerável e corrigida.
- Rota `GET /api/produtos?q=...&modo=vulneravel|corrigido`.
- SQL injection reproduzível e correção por consulta parametrizada.
- Compra fictícia por `POST /api/compras`, com quantidade de 1 a 10 e seletor independente entre preço do cliente (vulnerável) e preço do banco (corrigido).
- Botão de simulação em cada produto e resultado do cálculo na interface. Nenhum pagamento, reserva de estoque ou pedido persistido.
- Roteiro das duas demonstrações e testes HTTP de compra, adulteração, correção e regressão da busca.

Cada seletor muda **somente seu módulo** (busca ou compra). Não transforma a aplicação inteira em um sistema seguro.

### O que falta:

1. Cadastro/login com armazenamento vulnerável e corrigido de senhas; inspeção local para demonstrar a limitação do teste HTTP.

Cadastro/login **ainda não está implementado** e deve demonstrar a limitação obrigatória do Burp. a tarefa restante está na [issue 01](docs/issues/01-contas-e-senhas.md).

### Contrato da compra

Enviar JSON com `Content-Type: application/json` para `POST /api/compras`:

```json
{"produtoId":1,"quantidade":1,"precoUnitarioCentavos":15990,"modo":"vulneravel"}
```

Sucesso: status 201 e `{ "produtoId": 1, "quantidade": 1, "totalCentavos": 15990, "modo": "vulneravel", "simulacao": true }`.

`modo` aceita `vulneravel` (padrão) ou `corrigido`. Na versão vulnerável, preço deve ser um inteiro positivo em centavos. Na corrigida, ele é ignorado e pode ser omitido. As duas versões exigem produto publicado/existente e quantidade inteira de 1 a 10, rejeitando total fora do limite de inteiros seguros do JavaScript. Entradas inválidas retornam 400; produto inexistente/não publicado, 404.

## Demonstração

Siga [o roteiro do Burp](docs/DEMONSTRACAO.md). Com a Community, a identificação é manual: Proxy e Repeater não geram automaticamente um relatório de vulnerabilidades.

## Organização

```text
src/app.js                 configuração e integração de rotas
src/server.js              inicialização em loopback
src/database.js            catálogo e dados fictícios
src/routes/products.js     busca vulnerável e corrigida
src/routes/orders.js       compra simulada vulnerável e corrigida
public/                    interface (única pasta servida por HTTP)
scripts/reset-db.js        restauração do catálogo
test/orders.test.js        testes HTTP com SQLite em memória
docs/                      roteiro e issues
```

## Referências

- [Ferramentas do Burp](https://portswigger.net/burp/documentation/desktop/tools)
- [Edições do Burp](https://portswigger.net/burp)
- [SQLite nativo do Node.js](https://nodejs.org/api/sqlite.html)
- [Express](https://expressjs.com/en/starter/installing/)

Ausência de alerta não comprova segurança. Os testes automatizados deste projeto verificam o comportamento didático; não são uma auditoria de segurança completa.
