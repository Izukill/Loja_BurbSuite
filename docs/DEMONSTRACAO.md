# Passo a passo para verificar projeto com Burp

## Preparação

1. Execute `npm install` e `npm start`.
2. No Burp Community, abra o navegador integrado pela aba Proxy (Open browser).
3. Acesse **http://127.0.0.1:3000** nesse navegador.
4. Mantenha Intercept desligado durante a navegação para não deixar requisições paradas. O histórico continua registrando o tráfego.


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

### 2.1 Requisição no prôprio  input

Dentro da página, no input da busca, digite ' OR 1=1 -- na seleção com o modo vulnerável ativo, a consulta irá retornar o item de protótipo que esta com publicado=0.

## Demonstração Pronta - (Price Tampering)

### 1. Comportamento normal

Na página da loja, selecione a versão vulnerável da compra. No produto Teclado Aurora, mantenha a quantidade em 1 e clique em Simular compra.

### 2. Requisição pelo Repeater

No Proxy → HTTP history, encontre POST /api/compras, clique com o botão direito e escolha Send to Repeater.

No Repeater, altere precoUnitarioCentavos de 15990 para 100, mantendo os outros dados:

```http
POST /api/compras HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json

{"produtoId":1,"quantidade":1,"precoUnitarioCentavos":100,"modo":"vulneravel"}
```

Mantenha uma linha vazia entre os cabeçalhos e o JSON. Ao editar a requisição capturada, deixe o Burp atualizar o Content-Length automaticamente.


Clique em Send. O resultado esperado é:

```http
{
  "produtoId": 1,
  "quantidade": 1,
  "totalCentavos": 100,
  "modo": "vulneravel",
  "simulacao": true
}
```

### 2.1 Requisição pelo próprio navegador

```http
fetch('/api/compras', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    produtoId: 1,
    quantidade: 1,
    precoUnitarioCentavos: 100,
    modo: 'vulneravel'
  })
})
  .then(resposta => resposta.json())
  .then(resultado => console.log(resultado));
```

O resultado aparecerá no Console com totalCentavos: 100. A página não será atualizada automaticamente.

Diferentemente da busca com SQL injection, o preço não possui um campo editável na interface. Por isso, usamos o Console para enviar a requisição com o valor alterado.


### Lógica de negócio: preço adulterado

Interceptar a compra fictícia, alterar o preço para 100 centavos e comparar os modos. A versão corrigida consulta o preço no servidor.

Esse caso mostra a necessidade de conhecer a regra de negócio. Não o apresentar como impossibilidade absoluta do Burp: testes manuais com o próprio Repeater conseguem revelar a falha.

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

## Demonstração — Armazenamento inseguro de senhas (Limitação do teste puramente por tráfego HTTP)

### 1. Comportamento no navegador e observação pelo Burp Suite

1. Na seção **Área de Contas**, cadastre um usuário fictício com o modo **Vulnerável**:
   - Usuário: `aluno-demo`
   - Senha: `senha-ficticia-123`
   - Modo: `Vulnerável (texto puro no banco)`
2. Cadastre outro usuário (ou o mesmo no modo corrigido):
   - Usuário: `aluno-demo`
   - Senha: `senha-ficticia-123`
   - Modo: `Corrigido (scrypt com salt aleatório)`
3. Cadastre um terceiro usuário com a mesma senha no modo corrigido:
   - Usuário: `aluno-demo-2`
   - Senha: `senha-ficticia-123`
   - Modo: `Corrigido (scrypt com salt aleatório)`
4. Realize o login no formulário com credenciais válidas e depois teste com senha errada.

### 2. Inspeção de tráfego HTTP no Burp Suite

No Burp Suite (Proxy → HTTP history ou Repeater), observe as requisições e respostas de cadastro e login:

```http
POST /api/contas/cadastro HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json

{"usuario":"aluno-demo","senha":"senha-ficticia-123","modo":"vulneravel"}
```

Resposta HTTP (201 Created):
```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"mensagem":"Conta cadastrada com sucesso.","usuario":"aluno-demo","modo":"vulneravel"}
```

E no login:
```http
POST /api/contas/login HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json

{"usuario":"aluno-demo","senha":"senha-ficticia-123","modo":"vulneravel"}
```

Resposta HTTP (200 OK):
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"mensagem":"Autenticação realizada com sucesso.","usuario":"aluno-demo","modo":"vulneravel"}
```

**Observação crítica no Burp Suite:**
Tanto no modo vulnerável quanto no modo corrigido:
- As requisições HTTP enviam a senha pelo canal cliente-servidor (em texto claro ou HTTPS);
- As respostas HTTP **jamais retornam a senha, o salt ou o hash**;
- Não há qualquer erro, vazamento na resposta ou alerta gerado pelo Burp.

A simples observação ou interceptação do tráfego HTTP **não permite determinar** como o servidor armazena as credenciais no disco ou banco de dados.

### 3. Inspeção local do armazenamento no servidor

Para verificar o que realmente ocorreu no servidor, execute o script de inspeção local (que roda no terminal, sem expor endpoint HTTP):

```bash
npm run accounts:inspect aluno-demo
```

Saída observada:
```text
================================================================================
INSPEÇÃO LOCAL DO ARMAZENAMENTO DE CONTAS (data/contas.sqlite)
Este script roda exclusivamente no terminal local para fins didáticos.
Não existe endpoint HTTP que exponha estas informações.
================================================================================

[ID: 1] Usuário: aluno-demo | Modo: VULNERAVEL
Data de criação: 2026-11-15 19:36:56
    SENHA ARMAZENADA (TEXTO PURO - VULNERÁVEL): "senha-ficticia-123"
   -> Falha: Senha salva diretamente sem salt ou derivação de chave.

[ID: 2] Usuário: aluno-demo | Modo: CORRIGIDO
Data de criação: 2026-11-15 19:36:56
   HASH SEGURO (SCRYPT COM SALT ALEATÓRIO):
   $scrypt$N=16384,r=8,p=1,k=64$fb4014e1c86baf2423aef89168dab1a1$8e38d8045a2600bade099a2273cf95597f6ad65aa8c832dcfac100fdf9edd2046e5ae9f2dbb95d2d6cddeec3f1222dc2294a9b77580bdeee454397fbe2566be7
   -> Protegido: A senha original não pode ser revertida a partir do hash.
================================================================================
```

E inspecionando todos os registros (`npm run accounts:inspect`), nota-se que `aluno-demo` e `aluno-demo-2`, mesmo compartilhando a exata mesma senha no modo corrigido, possuem hashes e salts totalmente diferentes, inviabilizando ataques por Rainbow Tables.

### 4. Justificativa técnica e limites do Burp Suite

- **Envio de senha vs. Persistência de senha:** O fato de o cliente enviar a senha na requisição (esperado em rotas de autenticação) não indica se o backend armazena o dado de forma segura ou insegura.
- **Invisibilidade por tráfego HTTP:** Se o backend não vazar a senha em respostas, headers ou logs públicos, ferramentas de inspeção dinâmica de tráfego (DAST/Burp Suite) não têm como deduzir a fragilidade do armazenamento em repouso.
- **Ausência de alerta ≠ Segurança:** A ausência de alertas no Burp não atesta que a aplicação é segura.
- **Técnicas complementares:** A detecção desse tipo de vulnerabilidade depende fundamentalmente de **Revisão de Código (SAST)** e **Auditoria de Armazenamento/Banco de Dados**.
- **Consequências reais:** Caso ocorra um vazamento do banco de dados (`contas.sqlite`) ou de backups, no modo vulnerável as credenciais de todos os usuários são expostas instantaneamente, permitindo ataques de credential stuffing e quebra de privacidade em massa. No modo corrigido (`scrypt` com salt aleatório), o custo computacional para quebra de cada senha por força bruta torna-se impraticável.

---

## Fechamento

- Burp: testes dinâmicos por HTTP, inspeção de tráfego e apoio ao teste manual.
- Limites: comportamento não exercitado, rotas fora do alcance e informações internas sem exposição podem ficar fora da análise.
- Falsos positivos: diferenças em tamanho/status de resposta são indícios; confirmar acesso indevido com conteúdo concreto. Não chamar qualquer resposta 500 de SQL injection comprovada.
- No desenvolvimento: testar em ambiente local/de testes, corrigir, repetir a requisição.
