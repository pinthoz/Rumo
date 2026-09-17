# Rumo

A personal assistant built on Claude, organised into **separate areas** so that topics don't get mixed up and information isn't made up. The assistant speaks European Portuguese, so the commands and folder names are in Portuguese.

| area | what it's for | commands |
|---|---|---|
| **Rotina** (routine) | plan the day, 3 priorities, recurring tasks, beating procrastination, weekly review | `/hoje` `/foco` (focus blocks with a timer) `/feito` `/captura` `/travado` `/semana` `/lembretes` (Windows/Mac notifications); priorities show up when Claude Code opens |
| **Finanças** (finances) | import bank statements, categorise spending, budget and what's left to spend, fixed costs and subscriptions, net worth, learning to invest (with sources) | `/gastos` `/financas` `/investir` |
| **Pensar** (thinking) | discuss ideas with real research and challenges to the reasoning | `/pensar` |
| **Língua** (language) | European Portuguese and English proofreading, personal and professional | `/pt` `/en` |
| **Escrita** (writing) | creative writing: review standalone texts against the author's voice, check consistency, get unstuck (without writing for them); projects for long-form work | `/rever` · `/brief` `/critique` `/continuity` … |

## Layout

```text
CLAUDE.md            general rules: one area per conversation, don't make things up, the user decides
rotina/              area CLAUDE.md + tarefas.md + rotina.md
financas/            area CLAUDE.md + rules, budget, templates
pensar/              area CLAUDE.md + notes
lingua/              area CLAUDE.md + frequent mistakes + glossary
escrita/             area CLAUDE.md + projects, templates and docs (creative writing system)
.claude/             skills, agents and commands
scripts/             rotina.mjs · lembretes.mjs · financas.mjs · sincronizar.mjs · cwos.mjs (+ tests)
docs/                user guide, Claude app usage, limitations, setup questions (in Portuguese)
prototipo/rumo.html  the Rumo dashboard for claude.ai
```

Each area's `CLAUDE.md` is only loaded when working in that area. This is what keeps the assistant from mixing topics.

**Personal data stays out of git.** Files with personal data aren't tracked: tasks, routine, writing voice, frequent mistakes, glossary, budget, categorisation rules, accounts, goals, bank transactions and notes. The repository only holds a `*.modelo.*` template for each file. The scripts, or the assistant, create the personal copy on first use.

## Getting started

```bash
# requirements: Claude Code and Node >= 18
node scripts/rotina.mjs hoje
node scripts/financas.mjs help
npm test
```

Then, in Claude Code: `/hoje`.

## Rumo dashboard

A claude.ai page with the same areas, for use in the browser or on a phone:
- `/rumo` publishes it to your own account;
- `/sincronizar` syncs it both ways with the local files.

## Further reading (Portuguese)

- [docs/guia.md](docs/guia.md): full user guide.
- [docs/claude-app.md](docs/claude-app.md): using Rumo in the Claude app.
- [docs/limites.md](docs/limites.md): what the system can and can't do.
