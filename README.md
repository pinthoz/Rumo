# Rumo

Assistente pessoal para o Claude, organizado por **áreas separadas**, para não misturar assuntos nem inventar informação:

| área | para quê | comandos |
|---|---|---|
| **Rotina** | organizar o dia, 3 prioridades, tarefas recorrentes, vencer a procrastinação, revisão semanal | `/hoje` `/foco` (blocos com temporizador) `/feito` `/captura` `/travado` `/semana` `/lembretes` (notificações Windows/Mac); as prioridades aparecem ao abrir o Claude Code |
| **Finanças** | importar extratos, categorizar gastos, orçamento e quanto ainda se pode gastar, despesas fixas e subscrições, património, aprender a investir (com fontes) | `/gastos` `/financas` `/investir` |
| **Pensar** | discutir ideias com pesquisa real e questionamento da lógica | `/pensar` |
| **Língua** | corretor de português europeu e de inglês, pessoal e profissional | `/pt` `/en` |
| **Escrita** | escrita criativa: rever textos soltos contra a voz dele, verificar a coerência, desbloquear (sem escrever por ele); projetos para obras longas | `/rever` · `/brief` `/critique` `/continuity` … |

## Como está organizado

```text
CLAUDE.md            regras gerais: uma área por conversa, não inventar, o utilizador decide
rotina/              CLAUDE.md da área + tarefas.md (criado a partir do modelo, fora do git) + rotina.md
financas/            CLAUDE.md da área + regras, orçamento, modelos (os dados reais ficam fora do git)
pensar/              CLAUDE.md da área + notas
lingua/              CLAUDE.md da área + erros frequentes + glossário
escrita/             CLAUDE.md da área + projetos, templates e docs (sistema de escrita criativa)
.claude/             skills, agents e comandos
scripts/             rotina.mjs · lembretes.mjs · financas.mjs · cwos.mjs (+ testes)
docs/                guia, uso na app Claude, limites, perguntas para configurar
```

O `CLAUDE.md` de cada área só é lido quando se trabalha nessa área. É assim que se evita que o assistente misture assuntos.

## Começar

```bash
# requisitos: Claude Code e Node >= 18
node scripts/rotina.mjs hoje
node scripts/financas.mjs help
npm test
```

Depois, no Claude Code: `/hoje`.

**Rumo:** painel no claude.ai com as mesmas áreas (`/rumo` publica-o na tua conta; `/sincronizar` junta-o com os ficheiros daqui). O guia completo está em [docs/guia.md](docs/guia.md). Para usar na app Claude, ver [docs/claude-app.md](docs/claude-app.md). O que o sistema faz, e o que não consegue fazer, está em [docs/limites.md](docs/limites.md).
