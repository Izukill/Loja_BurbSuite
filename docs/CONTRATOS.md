# Integração e divisão do trabalho

## Parte A — entregue nesta base

Catálogo, busca, SQL injection, correção, interface inicial e roteiro dessa demonstração.

`GET /api/produtos?q=Teclado&modo=corrigido` retorna:

```json
{"modo":"corrigido","total":1,"produtos":[{"id":1,"nome":"Teclado Aurora","descricao":"Teclado compacto para sua mesa de estudos.","preco_centavos":15990}]}
```

Valores monetários são inteiros em centavos. Os modos aceitos são `vulneravel` (padrão) e `corrigido`. Erros retornam `{ "erro": "mensagem" }`. A busca não depende de login.

## Parte B — responsável: dupla

As rotas abaixo são propostas de contrato e **ainda não existem**.

### Contas — issue 01

- `POST /api/contas/cadastro`: `{ "usuario": "aluno-demo", "senha": "senha-ficticia", "modo": "vulneravel" }`; sucesso 201, resposta sem senha.
- `POST /api/contas/login`: mesmo corpo; sucesso 200 com mensagem genérica e identificação pública da conta, credenciais inválidas 401.
- `modo` aceita `vulneravel` ou `corrigido`. Manter contas de cada modo separadas ou identificadas pelo modo, sem converter hash em texto puro ao alternar.
- Criar `src/routes/accounts.js` e módulo de armazenamento próprio. Exportar um Router e registrar em `src/app.js`.
- **Usar conexão e arquivo `data/contas.sqlite` separados** de `catalogo.sqlite`. Não usar `ATTACH` na conexão vulnerável do catálogo.
- Nenhuma rota de listagem de senhas, download do banco, logs de senha ou publicação de código. Inspeção do armazenamento será feita no terminal local.
- A consulta de login deve ser parametrizada inclusive no modo vulnerável: o defeito desta etapa é o armazenamento, não outra SQL injection.
- Esta etapa pode apenas verificar credenciais. Não implementar uma autenticação de sessão improvisada nem alegar que o login concede uma sessão se não houver uma.

Essa separação é essencial: se a SQL injection também ler as senhas, o Burp poderá observar o vazamento e a demonstração de invisibilidade do armazenamento perde a premissa. Trata-se de uma escolha didática para isolar os casos.

### Compra — issue 02

- `POST /api/compras`: `{ "produtoId": 1, "quantidade": 1, "precoUnitarioCentavos": 15990, "modo": "vulneravel" }`.
- Sucesso 201: `{ "produtoId": 1, "quantidade": 1, "totalCentavos": 15990, "modo": "vulneravel", "simulacao": true }`.
- Na versão vulnerável, aceitar preço inteiro positivo vindo do cliente: adulterar de 15990 para 100 deve gerar total 100.
- Na corrigida, ignorar o preço do cliente e consultar `preco_centavos` no catálogo. A mesma requisição deve gerar total 15990.
- Ambas devem validar produto existente e publicado, quantidade inteira de 1 a 10 e limites numéricos para evitar erros de arredondamento/overflow. Erros de entrada: 400; produto inexistente/não publicado: 404.
- Criar `src/routes/orders.js`, exportar Router que recebe a conexão do catálogo e registrar em `src/app.js`.
- Sem cobrança, serviços externos ou dados reais. Nesta etapa, compra é só cálculo fictício; não depende da implementação do login.

## Interface

Adicionar uma área de contas e um botão de compra por produto, preservando a busca e seus testes. Usar DOM/textContent para conteúdo variável, sem inserir entradas como HTML. Cada módulo deve ter seu próprio seletor de modo, explicitamente nomeado.

## Ordem sugerida

Issue 01 → issue 02 → issue 03. A issue 02 pode começar antes da 01, pois não depende de sessão. Ensaiar os casos separadamente e depois em sequência. Os critérios verificáveis estão nos arquivos de issues.
