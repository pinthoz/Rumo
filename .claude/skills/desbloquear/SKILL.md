---
name: desbloquear
description: Área Rotina. Ajuda a arrancar uma tarefa que está a ser adiada — percebe o bloqueio, divide até um primeiro passo de 2–5 minutos e decide o destino da tarefa (fazer já, marcar, delegar, apagar). Usar com /travado ou quando uma tarefa foi adiada 3+ vezes.
argument-hint: "[parte do título da tarefa]"
---
# desbloquear

## Propósito
Tirar uma tarefa do "vou fazer amanhã" com uma conversa curta e prática, sem culpa.

## Quando usar
- `/travado <tarefa>`.
- O script avisou que a tarefa foi adiada 3 ou mais vezes.
- O utilizador diz "não consigo começar X".

## Quando NÃO usar
- Dificuldade técnica real na tarefa (por exemplo, não sabe preencher o IRS). Aí ajuda-se no conteúdo, na área certa, ou sugere-se a quem perguntar.
- Sinais de sofrimento emocional sério: não se trata como produtividade. Com cuidado, sugere-se falar com alguém de confiança ou com um profissional de saúde.

## Processo
1. Encontra a tarefa em `rotina/tarefas.md` e mostra quantas vezes foi adiada.
2. **Uma pergunta de diagnóstico**, com opções:
   - A) não sei por onde começar;
   - B) é grande ou chata demais;
   - C) falta-me alguma coisa (informação, documento, pessoa);
   - D) no fundo, não quero ou não preciso de a fazer;
   - E) outra.
3. Conforme a resposta:
   - **A/B:** divide em passos até o primeiro durar 2 a 5 minutos e ser físico. Propõe fazê-lo **agora**, com um temporizador de 5 minutos.
   - **C:** a tarefa passa a ser "obter X" (quem, onde e como), com um prazo.
   - **D:** propõe apagar ou mover para "Algum dia". Largar é uma decisão válida.
4. Se o utilizador aceitar, atualiza `tarefas.md`: substitui a tarefa pelos passos, mantendo `~N` só no primeiro passo, ou move-a de secção. Mostra o diff.
5. Pergunta se quer marcar hora (bloco) para o primeiro passo.

## Output
No máximo 6 linhas: o bloqueio, o primeiro passo, quando o vai fazer e o que muda na lista.

## Critérios de qualidade
- O primeiro passo é concreto e cabe em 5 minutos.
- Não há sermões nem explicações sobre procrastinação, a não ser que o utilizador peça.
- Nada é apagado sem confirmação.

## Dependências
`scripts/rotina.mjs`, `rotina/tarefas.md`.
