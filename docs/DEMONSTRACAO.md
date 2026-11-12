# Roteiro da apresentação

## Preparação

1. Execute `npm install`, `npm test` e `npm start`.
2. No Burp Community, abra o navegador integrado pela aba Proxy (Open browser).
3. Acesse **http://127.0.0.1:3000** nesse navegador.
4. Mantenha Intercept desligado durante a navegação para não deixar requisições paradas. O histórico continua registrando o tráfego.
5. Adicione somente a aplicação local ao escopo. Todos os testes são contra o laboratório próprio.

Não é necessário configurar certificado para este laboratório HTTP local. A senha enviada pelo próprio cliente não demonstra o formato usado no armazenamento do servidor.

## Demonstração pronta — SQL injection

### 1. Comportamento normal

Busque `Teclado`: aparece um produto. Busque `Protótipo`: nenhum produto. A consulta aplica `publicado = 1`, ocultando o produto de ID 5.

### 2. Requisição pelo Repeater

No Proxy → HTTP history, encontre `GET /api/produtos`, clique com o botão direito e use Send to Repeater. Envie esta requisição (termine os cabeçalhos com uma linha vazia):

```http
GET /api/produtos?q=%27%20OR%201%3D1%20--%20&modo=vulneravel HTTP/1.1
Host: 127.0.0.1:3000
Connection: close

```

O parâmetro decodificado é `' OR 1=1 -- `, com espaço depois de `--`. Resultado esperado: `total: 5`, incluindo o produto não publicado.

### 3. Explicação técnica

Abra `src/routes/products.js`. A interpolação produz uma condição equivalente a:

```sql
WHERE publicado = 1 AND nome LIKE '%' OR 1=1 -- %'
```

`OR 1=1` torna a condição verdadeira; `--` comenta o restante. A consulta devolve inclusive o registro não publicado. Este é um vazamento fictício de informação interna, não apenas um erro do servidor.

Em um sistema real, as consequências dependem dos dados, das consultas e das permissões disponíveis. Não alegar que esta demonstração provou execução de comandos ou alteração de dados: ela comprova leitura indevida no catálogo.

### 4. Correção e repetição

Na mesma requisição, troque apenas `modo=vulneravel` por `modo=corrigido` e envie novamente. Resultado esperado: `total: 0`.

A consulta parametrizada trata a sequência como texto de busca, sem mudar a estrutura SQL. Uma busca normal por `Teclado` continua funcionando. O filtro de publicação permanece necessário: parametrização não substitui autorização.

### 5. O que foi demonstrado

O Burp possibilitou inspecionar, manipular e repetir a requisição. Na Community, o testador identificou a falha ao interpretar a resposta. Não houve Scanner automático nem alerta automático de SQL injection.

## Demonstrações pendentes — dupla

### Limitação obrigatória: armazenamento de senhas

Implementar a issue 01 antes de apresentar este caso. Mostrar login/cadastro pelo Burp sem respostas contendo senhas, depois inspecionar código e banco local. No modo vulnerável, o valor fica em texto puro; na versão corrigida, em formato de hash apropriado com salt.

Com acesso somente a HTTP e sem vazamentos, não há evidência suficiente para o Burp determinar como a senha foi persistida. Não basta dizer “não apareceu alerta”: mostrar a falha no armazenamento e justificar a ausência de visibilidade. Revisão de código e inspeção autorizada do banco são as técnicas complementares.

Consequência real: acesso indevido a banco ou backups revelaria senhas imediatamente. Usar apenas valores fictícios. A inspeção local feita pelo apresentador não é uma funcionalidade do Burp.

### Lógica de negócio: preço adulterado

Implementar a issue 02. Interceptar a compra fictícia, alterar o preço para 100 centavos e comparar os modos. A versão corrigida consulta o preço no servidor.

Esse caso mostra a necessidade de conhecer a regra de negócio. Não o apresentar como impossibilidade absoluta do Burp: testes manuais com o próprio Repeater conseguem revelar a falha.

## Fechamento

- Burp: testes dinâmicos por HTTP, inspeção de tráfego e apoio ao teste manual.
- Limites: comportamento não exercitado, rotas fora do alcance e informações internas sem exposição podem ficar fora da análise.
- Falsos positivos: diferenças em tamanho/status de resposta são indícios; confirmar acesso indevido com conteúdo concreto. Não chamar qualquer resposta 500 de SQL injection comprovada.
- No desenvolvimento: testar em ambiente local/de testes, corrigir, repetir a requisição e acrescentar teste de regressão. Complementar com revisão de código e análise de dependências.
- O projeto só atenderá à exigência de limitação prática após a entrega da issue 01. A demonstração atual de SQLi, isoladamente, não basta para o trabalho inteiro.
