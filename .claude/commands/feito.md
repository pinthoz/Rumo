---
description: "Rotina: marcar tarefas como feitas (fecho do dia)"
argument-hint: "[parte do título, ou vazio para rever o dia]"
---
[Área: Rotina]. Segue as regras de `rotina/CLAUDE.md` e não uses informação de outras áreas.

- **Com título:** corre `node scripts/rotina.mjs feito "<parte do título>"` e confirma numa linha. Se o script disser que é ambíguo, mostra as opções e pergunta qual é.
- **Sem título (fecho do dia, 2 minutos):**
  1. Corre `node scripts/rotina.mjs hoje` e pergunta quais das prioridades ficaram feitas. Marca-as com `feito`.
  2. Para as que não foram feitas, pergunta se passam para amanhã (`adiar`) ou para outra data.
  3. Termina com uma frase sobre o que correu bem, sem sermão.

Pedido: $ARGUMENTS
