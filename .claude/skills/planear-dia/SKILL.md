---
name: planear-dia
description: Área Rotina. Monta o plano do dia com no máximo 3 prioridades a partir de rotina/tarefas.md, triando a caixa de entrada e propondo blocos de tempo. Usar de manhã, quando o utilizador pergunta "o que faço hoje?", ou na primeira vez para criar a rotina-base.
argument-hint: "[notas sobre o dia: compromissos, energia]"
---
# planear-dia

## Propósito
Transformar a lista de tarefas num dia possível, com 3 coisas importantes e um primeiro passo claro.

## Quando usar
- De manhã (`/hoje`).
- Quando o utilizador está disperso e não sabe por onde começar.
- Na primeira vez: para criar `rotina/rotina.md` com ele.

## Quando NÃO usar
- Há uma tarefa específica bloqueada: usa `desbloquear`.
- É fim de semana de revisão: usa `revisao-semanal`.

## Inputs
O output de `node scripts/rotina.mjs hoje`, `rotina/rotina.md` e o que o utilizador disser sobre o dia (compromissos, energia, tempo livre). Não uses outras fontes.

## Processo
1. **Primeira vez** (se `rotina/rotina.md` estiver por preencher): faz no máximo 5 perguntas.
   1. A que horas acorda e se deita?
   2. Que horário tem de trabalho e de compromissos fixos?
   3. Em que altura do dia tem mais energia?
   4. O que costuma fazê-lo dispersar?
   5. Que 1 ou 2 hábitos quer construir?

   Escreve as respostas em `rotina/rotina.md` e mostra-lhe o resultado. No fim, oferece os lembretes automáticos (`/lembretes`) com horas que batam com a rotina dele.
2. Corre `node scripts/rotina.mjs hoje`.
3. **Caixa de entrada:** se tiver itens, propõe para cada um (numa linha): fazer já (menos de 2 minutos), passar a tarefa (com prioridade e prazo), "Algum dia" ou apagar. O utilizador decide; depois atualizas `rotina/tarefas.md`, movendo a linha para a secção certa.
4. **Foco:** apresenta as 3 prioridades do script. Pergunta se trocaria alguma, tendo em conta os compromissos do dia.
5. Para cada prioridade, escreve o **primeiro passo físico** (2 a 5 minutos) e, se houver tempo livre conhecido, um bloco horário.
6. Se o script mostrar tarefas crónicas (adiadas 3 ou mais vezes), menciona-as numa linha e oferece `/travado`, sem insistir.
7. Termina com o plano em no máximo 10 linhas.
8. Ao criar ou triar tarefas que se repetem (contas, hábitos), sugere o token de recorrência (`*semanal`, `*mensal`…). Assim, quando a tarefa for marcada como feita, a seguinte é criada automaticamente.
9. Lembra-o, numa linha, de que pode arrancar já com `/foco` e de que ao fim do dia há o `/feito`.

## Output
```
Hoje (qui 17/09)
1. Declaração de IRS — primeiro passo: abrir o portal e procurar a senha (5 min) · 10h00–10h30
2. …
3. …
Depois disto, se sobrar tempo: …
```

## Critérios de qualidade
- No máximo 3 prioridades.
- Cada uma tem um primeiro passo concreto.
- As alterações a `tarefas.md` só se fazem depois de o utilizador confirmar.
- Não se misturam assuntos de outras áreas.

## Dependências
`scripts/rotina.mjs`, `rotina/tarefas.md`, `rotina/rotina.md`. Relacionadas: `desbloquear`, `revisao-semanal`.
