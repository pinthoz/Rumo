# Área: Rotina

Serve para ajudar o utilizador a **fazer menos coisas de cada vez e a acabá-las**. Ele descreve-se como alguém que se dispersa e adia tarefas. O objetivo não é um sistema perfeito: é um sistema que ele usa.

## Ficheiros
| ficheiro | conteúdo |
|---|---|
| `rotina/tarefas.md` | todas as tarefas (caixa de entrada, tarefas, algum dia). Formato no topo do ficheiro. Fica fora do git; os scripts criam-no a partir de `tarefas.modelo.md` se faltar |
| `rotina/rotina.md` | a rotina-base que ele escolheu (horários, blocos, hábitos). Fora do git; se faltar, copia `rotina.modelo.md` |
| `rotina/revisoes/AAAA-Www.md` | revisões semanais |

**Lembretes automáticos:** `node scripts/lembretes.mjs instalar|remover|estado|testar` (comando `/lembretes`). São notificações do sistema (Windows e Mac) geradas por script, em horas fixas: manhã, prazo, tarde e semana.

**Ao abrir o Claude Code**, um hook (`.claude/settings.json` → `rotina.mjs arranque`) mostra ao utilizador as prioridades do dia numa linha. Essa linha não entra no contexto do modelo; não a comentes a não ser que ele pergunte.

**Blocos de foco:** `/foco` (skill `modo-foco`) com `node scripts/lembretes.mjs temporizador <min> "texto"`, que avisa no fim do bloco.

**As tarefas mudam-se sempre com `node scripts/rotina.mjs`** (`hoje`, `captura`, `adiar`, `feito`, `semana`). Nunca se editam contagens à mão.

## Princípios
1. **No máximo 3 prioridades por dia.** O resto não é "falhar": é para outro dia.
2. **Primeiro passo mínimo.** Uma tarefa que assusta divide-se até o primeiro passo levar 2 a 5 minutos e ser físico e concreto ("abrir o portal das Finanças", e não "tratar do IRS").
3. **Capturar para não dispersar.** Uma ideia que surge a meio de outra coisa vai para a caixa de entrada (`/captura`) e não interrompe o que se está a fazer.
4. **Blocos de tempo curtos** (por exemplo, 25 minutos) com pausa. Uma tarefa de cada vez.
5. **Adiar conta, não culpa.** Uma tarefa adiada 3 ou mais vezes é um sinal. Pergunta-se porquê e decide-se: dividir, marcar hora, delegar ou apagar (`/travado`).
6. **Revisão semanal curta** (15–20 minutos): o que foi feito, o que ficou, o que se larga.
7. **Sem sermões.** Não se explica a procrastinação ao utilizador nem se citam estudos sem fonte. Se ele pedir fundamentação, pesquisa-se e cita-se (regra 2 do `CLAUDE.md` raiz).

## O que não fazer
- Criar listas enormes ou planos de 12 passos.
- Reorganizar o sistema todo quando ele só pediu o plano de hoje.
- Trazer assuntos de outras áreas (finanças, escrita) para o plano, a não ser que já estejam como tarefas em `tarefas.md`.
