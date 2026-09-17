# Arquitetura

> Nota: este sistema é agora a área **Escrita** do assistente pessoal. As pastas abaixo vivem em `escrita/` (projetos em `escrita/projetos/`, templates em `escrita/templates/`), e as regras da área estão em `escrita/CLAUDE.md`.

A área Escrita do Rumo separa as responsabilidades em camadas. Cada camada tem uma função única; se uma informação aparece em duas camadas, é um bug.

```text
rumo/  (só a parte da escrita)
├── CLAUDE.md                 regras globais (carregado sempre)
├── .claude/
│   ├── skills/<nome>/SKILL.md   procedimentos especializados (18)
│   ├── agents/<nome>.md         especialistas autónomos (12)
│   ├── commands/<nome>.md       atalhos /comando → skill/agent (15)
│   └── settings.json            permissões do projeto
├── scripts/
│   ├── cwos.mjs              CLI determinística (Node, zero dependências)
│   ├── cwos.test.mjs         testes do CLI (npm test)
│   ├── system.test.mjs       integridade de skills, agents e comandos
│   └── data/cliches-*.txt    listas de clichés por língua
├── templates/                formatos padrão (fichas, cenas, relatórios)
├── docs/                     esta documentação (para humanos)
└── escrita/projetos/
    ├── ACTIVE.md             aponta para o projeto ativo (importado pelo CLAUDE.md)
    └── <slug>/               um projeto de escrita (ver abaixo)
```

## Camadas

| camada | responsabilidade | quando é carregada |
|---|---|---|
| `CLAUDE.md` | identidade do sistema, hierarquia de autoridade, canon, modos, severidades, gates | sempre |
| `escrita/projetos/<slug>/PROJECT.md` | identidade e regras criativas **deste** projeto | sempre (via `@import` em `ACTIVE.md`) |
| Skills | *como* fazer uma tarefa (processo, critérios) | quando a tarefa o pede, ou por `/nome` |
| Agents | *quem* faz uma tarefa isolada, com contexto próprio e ferramentas limitadas | quando o orchestrator (sessão principal) delega |
| Commands | atalhos que escolhem o modo e a skill ou agent | `/comando` |
| Scripts | operações mecânicas verificáveis | por comando `node scripts/cwos.mjs …` |
| Templates | forma dos documentos | pelo `cwos new` e pelo `cwos add` |
| Ficheiros de projeto | conhecimento persistente (canon, bible, manuscrito) | seletivamente (`cwos context`, `canon-index`) |
| MCPs | acesso a ferramentas externas | só quando a tarefa o exige (ver `mcp.md`) |

Os agents pré-carregam as skills de que precisam (campo `skills:` no frontmatter). O procedimento existe num só sítio (a skill) e o agent acrescenta apenas o papel, as ferramentas e o formato de output.

## Estrutura de um projeto

O `cwos new <slug> --profile <perfil>` cria só o necessário:

| caminho | short | long | universe |
|---|:-:|:-:|:-:|
| `PROJECT.md` — identidade e regras criativas | ✓ | ✓ | ✓ |
| `project/brief.md` — brief, temas, direção criativa | ✓ | ✓ | ✓ |
| `project/style-guide.md` | ✓ | ✓ | ✓ |
| `story/premise.md` — logline, conflito, stakes, sinopse | ✓ | ✓ | ✓ |
| `story/outline.md` · `story/timeline.md` | ✓ | ✓ | ✓ |
| `story/structure.md` — atos, beats, arcos | | ✓ | ✓ |
| `characters/` · `world/` | ✓ | ✓ | ✓ |
| `world/rules.md` | | ✓ | ✓ |
| `world/{locations,cultures,institutions,technology,history,objects}/` | | | ✓ |
| `research/sources.md` · `research/notes/` | ✓ | ✓ | ✓ |
| `manuscript/scenes/` | ✓ | ✓ | ✓ |
| `manuscript/chapters/` | | ✓ | ✓ |
| `editorial/decisions.md` · `editorial/reports/` | ✓ | ✓ | ✓ |
| `editorial/qa/` | | ✓ | ✓ |
| `archive/` | ✓ | ✓ | ✓ |

Pastas geradas ou opcionais: `editorial/canon-index.md` (gerado), `editorial/style/` (listas de clichés do projeto), `manuscript/drafts/` (versões paralelas, ignoradas pelo `cwos`) e `export/` (manuscrito final, ignorado pelo `cwos`).

### Simplificações face à proposta inicial

| proposto | decisão | porquê |
|---|---|---|
| `characters/index.md`, `world/index.md`, `research/verified-facts.md` | substituídos por `editorial/canon-index.md` gerado | um índice mantido à mão desatualiza-se |
| `project/themes.md`, `creative-direction.md` | secções de `brief.md` | são sempre lidos juntos |
| `project/constraints.md` | secção "Restrições" de `PROJECT.md` | as restrições têm de estar sempre em contexto |
| `story/synopsis.md`, `story/arcs.md` | secções de `premise.md` e `structure.md` | evita ficheiros de 10 linhas |
| cena: sheet e texto separados | um ficheiro por cena (sheet + `## Texto`) | quem escreve ou critica precisa sempre dos dois |
| `.claude/settings/` | `.claude/settings.json` | formato real do Claude Code |
| comandos `/dialogue`, `/pacing`, `/voice`, `/research` | são as próprias skills | evita colisão de nomes |

## Vários projetos

Um repositório pode ter vários projetos em `escrita/projetos/`. O `cwos use <slug>` muda o ativo, reescrevendo `escrita/projetos/ACTIVE.md`; o novo `PROJECT.md` entra em contexto na sessão seguinte. Todas as melhorias ao sistema (skills, agents, scripts) aplicam-se a todos os projetos.

## Princípios de desenho

1. **Determinístico primeiro:** tudo o que um script consegue verificar (ids, referências, ordem, contagens, grafias) não é deixado ao modelo.
2. **Contexto seletivo:** `cwos context` e `canon-index` decidem o que ler.
3. **Canon explícito:** o estado vive no frontmatter, as decisões em `decisions.md` e o histórico no git.
4. **Crítica separada de edição:** os agents de crítica não têm permissão de edição do manuscrito.
5. **O mais simples que funcione:** perfis de projeto, ficheiros fundidos, um único CLI.
