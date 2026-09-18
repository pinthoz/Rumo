---
description: "Rotina: configurar notificações automáticas (Windows e Mac)"
argument-hint: "[instalar | remover | estado | testar]"
---
[Área: Rotina]. Segue as regras de `rotina/CLAUDE.md`.

Os lembretes são notificações do sistema geradas por script (sem IA), a partir de `rotina/tarefas.md`:

| lembrete | o que mostra | por omissão |
|---|---|---|
| manha | as 3 prioridades do dia | 09:00 |
| prazo | tarefas com prazo hoje ainda por fazer (se não houver, não aparece) | 15:00 |
| tarde | fecho do dia: quantas foram feitas e o que ficou → `/feito` | 18:30 |
| semana | revisão semanal → `/semana` | domingo, 17:00 |

**Instalar** (ou vazio):
1. Pergunta, numa só mensagem, se os horários por omissão servem ou que horários prefere, e se quer desligar algum. Poucos lembretes funcionam melhor do que muitos.
2. Mostra o plano com `node scripts/lembretes.mjs instalar --dry …`, com as opções escolhidas.
3. Depois de o utilizador confirmar, corre sem `--dry` e a seguir `node scripts/lembretes.mjs testar`. Pergunta se a notificação apareceu. No Mac, se não aparecer, indica a mensagem do script sobre as permissões de notificações.

**remover / estado / testar:** corre `node scripts/lembretes.mjs <ação>` e resume o resultado numa linha.

Os lembretes só aparecem com o computador ligado e a sessão iniciada.

Pedido: $ARGUMENTS
