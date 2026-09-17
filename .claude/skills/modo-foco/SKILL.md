---
name: modo-foco
description: Área Rotina. Para o momento "estou disperso/perdido agora" — esvazia a cabeça para a caixa de entrada, escolhe UMA coisa, define o primeiro passo e arranca um bloco de foco com temporizador e notificação no fim. Usar com /foco ou quando o utilizador diz que se perdeu, não se concentra ou anda a saltar entre coisas.
argument-hint: "[tarefa] [minutos]"
---
# modo-foco

## Propósito
Passar de "tenho mil coisas na cabeça" para "estou a fazer uma coisa durante 25 minutos" em menos de 2 minutos de conversa.

## Quando usar
- `/foco`, ou "perdi-me", "não me consigo concentrar", "ando a saltar de coisa em coisa".
- Depois do `/hoje`, para arrancar a primeira prioridade.

## Quando NÃO usar
- Planear o dia inteiro: usa `planear-dia`.
- Uma tarefa adiada muitas vezes, com bloqueio de fundo: usa `desbloquear`.
- Cansaço extremo ou mal-estar: sugere uma pausa a sério, sem forçar um bloco.

## Processo
1. **Esvaziar (30 segundos):** "O que te está a passar pela cabeça agora?" Cada coisa que não seja a tarefa escolhida vai para a caixa de entrada com `node scripts/rotina.mjs captura "…"`. Não se discute nenhuma.
2. **Escolher UMA coisa:**
   - se ele indicou a tarefa, é essa;
   - se não, corre `node scripts/rotina.mjs hoje` e propõe a prioridade n.º 1, e ele confirma ou troca.
3. **Primeiro passo:** uma ação física de 2 a 5 minutos ("abrir o ficheiro X", e não "tratar do relatório").
4. **Duração:**
   - 25 minutos por omissão;
   - se ele estiver com muita resistência, 10 minutos;
   - no máximo 50 minutos.
5. **Preparar (uma linha):** fechar separadores e notificações que não interessam, telemóvel longe, água ao lado.
6. **Arrancar:** `node scripts/lembretes.mjs temporizador <min> "Fim do bloco: <tarefa>. Pausa de 5 min, depois /feito ou /foco."`.
7. **Despedida curta:** "Vai. Eu não te interrompo." Não acrescentes mais nada.
8. **No regresso** (se ele voltar à conversa):
   - pergunta como correu, numa linha;
   - se acabou, `node scripts/rotina.mjs feito "…"`;
   - se não acabou, propõe outro bloco ou deixar para amanhã (`adiar`);
   - depois de 3 ou 4 blocos seguidos, sugere uma pausa mais longa (15 a 30 minutos).

## Output
No máximo 5 linhas antes do bloco:
```
Foco: Declaração de IRS
Primeiro passo: abrir o portal das Finanças e encontrar a senha
25 min (termina às 10:35) — telemóvel longe, só este separador aberto
```

## Critérios de qualidade
- Uma única tarefa.
- O primeiro passo é concreto.
- O temporizador foi mesmo lançado (o script confirma a hora de fim).
- Não há conversa desnecessária antes de arrancar.
- As ideias paralelas ficam capturadas e não são discutidas.

## Dependências
`scripts/rotina.mjs` (`hoje`, `captura`, `feito`, `adiar`), `scripts/lembretes.mjs temporizador`. O temporizador corre em segundo plano; se o computador suspender, o aviso atrasa.
