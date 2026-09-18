---
name: revisao-semanal
description: Área Rotina. Revisão semanal de 15–20 minutos — o que foi feito, o que ficou, o que se larga, prioridades da próxima semana — com registo em rotina/revisoes/. Usar uma vez por semana ou quando o utilizador sente que "perdeu o fio".
---
# revisao-semanal

## Propósito
Fechar a semana com clareza e começar a seguinte com poucas prioridades escolhidas pelo utilizador.

## Quando usar
- No dia e hora marcados em `rotina/rotina.md`, ou com `/semana`.
- Quando a lista cresceu tanto que já não serve para nada.

## Quando NÃO usar
- Para planear só o dia de hoje: usa `planear-dia`.

## Inputs
`node scripts/rotina.mjs semana` e `rotina/tarefas.md`.

## Processo
1. Corre `node scripts/rotina.mjs semana`.
2. **Reconhecer:** lista o que foi feito, sem comentários exagerados.
3. **Limpar:** percorre as tarefas atrasadas e as mais adiadas. Para cada uma, o utilizador escolhe: manter com nova data, dividir, mover para "Algum dia" ou apagar. Não decidas pelo utilizador.
4. **Caixa de entrada a zero:** triagem como em `planear-dia`.
5. **Próxima semana:** pergunta pelas 3 prioridades da semana e marca-as com `!1`.
6. **Uma melhoria:** pergunta o que atrapalhou mais esta semana e acorda **uma** mudança pequena para a próxima.
7. Guarda um resumo em `rotina/revisoes/AAAA-Www.md` (feitas, largadas, prioridades, melhoria).

## Output
Tarefas atualizadas, o ficheiro da revisão e um resumo de no máximo 8 linhas.

## Critérios de qualidade
- Dura pouco: não transformar a revisão numa sessão de planeamento de 1 hora.
- Todas as decisões são do utilizador.
- Há no máximo 1 melhoria acordada.

## Dependências
`scripts/rotina.mjs`, `rotina/tarefas.md`, `rotina/revisoes/`.
