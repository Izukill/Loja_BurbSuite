# Implementar contas e demonstrar armazenamento inseguro de senhas

Responsável sugerido: integrante B (dupla). Prioridade: alta, pois atende à limitação obrigatória do enunciado.

## Objetivo

Criar cadastro/login local com dois modos de armazenamento, mantendo respostas HTTP sem senhas. Demonstrar por que a observação do tráfego não revela o armazenamento inseguro do servidor.

## Escopo

- Ler `docs/CONTRATOS.md` e implementar as rotas propostas de cadastro/login.
- Criar `src/routes/accounts.js`, armazenamento separado em `data/contas.sqlite` e uma interface simples de contas.
- Modo vulnerável: persistir senha fictícia em texto puro, com comentário indicando a falha intencional.
- Modo corrigido: usar função apropriada de hash de senha, como `scrypt` de `node:crypto`, salt aleatório por senha e comparação adequada. Guardar parâmetros/salt/hash, nunca criptografia reversível ou SHA-256 puro.
- Usar queries parametrizadas nos dois modos. Tratar usuário duplicado e entradas inválidas; definir limites de tamanho e usar somente dados fictícios.
- Separar registros por modo; não retornar senha, salt ou hash na resposta de cadastro/login.
- Criar script de inspeção local com consulta parametrizada por usuário fictício para comparar armazenamento. Não criar endpoint para inspeção.
- Acrescentar testes de cadastro, login válido/inválido, duplicidade, isolamento de modos e ausência de dados de senha nas respostas.
- Atualizar o roteiro com passos e resultados realmente observados.

## Critérios de aceite

- [ ] Cadastro e login funcionam conforme os contratos, com formulário e mensagens de erro.
- [ ] Modo vulnerável guarda texto puro; modo corrigido não guarda a senha original.
- [ ] Dois usuários com a mesma senha têm representações diferentes no modo corrigido devido aos salts.
- [ ] Catálogo não consegue acessar as contas pela conexão SQLite vulnerável; não usar ATTACH.
- [ ] Código, bancos e inspeção não ficam acessíveis por HTTP; respostas e logs não expõem senhas.
- [ ] Testes do catálogo continuam passando e os testes novos passam.
- [ ] Demonstração mostra código, banco e tráfego e justifica tecnicamente a limitação, sem alegar que ausência de alerta comprova segurança.
- [ ] README explica eventuais dependências novas e como inspecionar/restaurar contas fictícias.

## Evidência para a apresentação

Capturar requisição/resposta do login e saída da inspeção local. Explicar consequências de vazamento de banco/backup e como revisão de código/armazenamento complementa o Burp. Não confundir envio da senha pelo cliente com seu formato de persistência. Esta etapa não exige criar sessões de autenticação.
