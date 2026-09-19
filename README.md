# Rumo

A personal assistant built on Claude, organised into **separate areas** so that topics don't get mixed up and information isn't made up. The assistant speaks European Portuguese, so the commands and folder names are in Portuguese.

| area | what it's for | commands |
|---|---|---|
| **Rotina** (routine) | plan the day, 3 priorities, optionally triage actionable Gmail messages, recurring tasks, beating procrastination, weekly review | `/hoje` `/foco` (focus blocks with a timer) `/feito` `/captura` `/travado` `/semana` `/lembretes` (Windows/Mac notifications); priorities show up when Claude Code opens |
| **Finanças** (finances) | import bank statements, categorise spending, budget and what's left to spend, fixed costs and subscriptions, net worth, learning to invest (with sources) | `/gastos` `/financas` `/investir` |
| **Carreira** (job search) | find openings across job boards and company ATS pages (plus a logged-out LinkedIn search, on request), score each one against your own CV requirement by requirement, and keep one list of applications with follow-up dates | `/procurar` `/vaga` `/candidaturas` |
| **Pensar** (thinking) | discuss ideas with real research and challenges to the reasoning | `/pensar` |
| **Língua** (language) | European Portuguese and English proofreading, personal and professional | `/pt` `/en` |
| **Escrita** (writing) | creative writing: review standalone texts against the author's voice, check consistency, get unstuck (without writing for them); projects for long-form work | `/rever` · `/brief` `/critique` `/continuity` … |

## Layout

```text
CLAUDE.md            general rules: one area per conversation, don't make things up, the user decides
rotina/              area CLAUDE.md + tarefas.md + rotina.md
financas/            area CLAUDE.md + rules, budget, templates
carreira/            area CLAUDE.md + CV, search profile, sources, applications
pensar/              area CLAUDE.md + notes
lingua/              area CLAUDE.md + frequent mistakes + glossary
escrita/             area CLAUDE.md + projects, templates and docs (creative writing system)
.claude/             skills, agents and commands
scripts/             rotina.mjs · lembretes.mjs · financas.mjs · carreira.mjs · sincronizar.mjs · cwos.mjs (+ tests)
docs/                user guide, Claude app usage, limitations, setup questions (in Portuguese)
prototipo/rumo.html  the Rumo dashboard for claude.ai
```

Each area's `CLAUDE.md` is only loaded when working in that area. This is what keeps the assistant from mixing topics.

**Personal data stays out of git.** Files with personal data aren't tracked: tasks, routine, writing voice, frequent mistakes, glossary, budget, categorisation rules, accounts, goals, bank transactions and notes, CV, search profile and job applications. The repository only holds a `*.modelo.*` template for each file. The scripts, or the assistant, create the personal copy on first use.

## Getting started

```bash
# requirements: Claude Code and Node >= 18
node scripts/rotina.mjs hoje
node scripts/financas.mjs help
npm test
```

Then, in Claude Code: `/hoje`.

For a local visual interface, run `npm run atalho` once on Windows: it draws the Rumo compass into `prototipo/rumo.ico` and creates a **`Rumo`** shortcut in the project folder that opens the dashboard with no console window. Elsewhere, run `npm run painel`. It opens the same dashboard in the browser, connected only to the personal files in this folder. The server runs in the background, so no terminal window has to stay open: `npm run painel:estado` says whether it is running and `npm run painel:parar` stops it. The **Configurar** area edits routine, career profile, CV, financial goals, glossary, frequent errors and writing voice without needing to find or open Markdown files.

The local panel does what the published page cannot, because it runs on your machine:

- **Claude without an API key** — the AI-backed tabs ask the Claude Code CLI already installed (`claude -p`, restricted mode), using your subscription.
- **Job search that actually searches** — one click searches public postings (never logging in to LinkedIn) and appends what it finds to `carreira/vagas.csv`, so it is still there next time.
- **Writes into the repo** — the CV you upload (a PDF is read in the browser; only the text leaves it) is saved to `carreira/cv.md`, with a backup in `.sync/backups/`.
- **Usage limits** — a small badge, bottom right, showing how much of your Claude quota is left.

## Rumo dashboard

A claude.ai page with the same areas, for use in the browser or on a phone:
- `/rumo` publishes it to your own account;
- `/sincronizar` syncs it both ways with the local files (tasks, money, applications and the CV — only the Markdown, never the original file);
- with your Gmail and Google Calendar connectors, the Hoje and Semana tabs show the emails that need an answer and the week's events, read-only.

## Architecture

How the pieces fit together (instructions, data, scripts, dashboard and sync): [docs/architecture.md](docs/architecture.md).

## Credits

The Carreira area borrows its shape — a requirement-by-requirement evaluation, one tracker file, posting-legitimacy checks — from [career-ops](https://github.com/career-ops-hq/career-ops) (MIT), rebuilt here with no dependencies. It reads job boards only through their public APIs, one request per source per day, keeping each posting's original link and source, which is what Remotive and Remote OK ask for. LinkedIn has no public jobs API and its terms forbid automated collection, so it is never scraped on a schedule: it is searched only when you ask, logged out.

## Further reading (Portuguese)

- [docs/guia.md](docs/guia.md): full user guide.
- [docs/claude-app.md](docs/claude-app.md): using Rumo in the Claude app.
- [docs/limites.md](docs/limites.md): what the system can and can't do.
