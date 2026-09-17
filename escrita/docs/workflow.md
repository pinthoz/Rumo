# Workflow

## Pipeline completo

| # | etapa | modo | comando | faz | produz | gates |
|---|---|---|---|---|---|---|
| 1 | Ideia → Brief | DISCOVER | `/brief` | skill `creative-brief` | `project/brief.md` | — |
| 2 | Premissa e arquitetura | ARCHITECT | `/architect` | skill `story-architecture` (agent `story-architect`) | `story/premise.md`, `structure.md` | G2, G4 |
| 3 | Personagens | ARCHITECT | `/character` | skill `character-development` | `characters/*.md` | G3 |
| 4 | Mundo | ARCHITECT | `/world` | skill `worldbuilding` | `world/*` | G1 |
| 5 | Outline | ARCHITECT | `/outline` | skill `story-architecture` | `story/outline.md`, cenas vazias, timeline | G5 |
| 6 | Cena | ARCHITECT | `/scene` | skill `scene-design` | scene sheet | G5 |
| 7 | Research | RESEARCH | `/research` (skill) | skill `research` (delega no agent `researcher` se extensa) | `research/notes/fact-*` | G9 |
| 8 | Draft | DRAFT | `/draft` | skill `creative-writing` | `## Texto` | G5, G6 |
| 9 | Crítica | CRITIQUE | `/critique` | agents `literary-editor`, `scene-editor`, `devils-advocate`… | `editorial/reports/*` | todos |
| 10 | Edição estrutural e de personagem | EDIT | `/edit` | skill `editing` | texto revisto (`stage: revisto`) | G2–G5 |
| 11 | Continuidade | CONTINUITY | `/continuity` | skill `continuity-check` (agent `continuity-editor`) | relatório | G1, G10 |
| 12 | Factos | RESEARCH | `/factcheck` | agent `fact-checker` | relatório | G9 |
| 13 | Voz e estilo | POLISH | `/voice` | skill `voice` | desvios, style guide | G6 |
| 14 | Linha | POLISH | `/polish` | agent `line-editor` | texto polido | G8 |
| 15 | QA final | FINAL | `/qa` | agent `quality-controller` | `editorial/qa/*` | G1–G10 |
| 16 | Manuscrito | FINAL | `/final` | skill `final-manuscript` | `export/<slug>-final.md` | — |

Entre etapas, o autor aprova (ou não) as propostas. Cada aprovação que cria canon fica registada em `editorial/decisions.md`.

## Pipelines reduzidos (escolha dinâmica)

| tarefa | pipeline mínimo |
|---|---|
| Poema | brief (curto) → draft → `/critique` (literary) → `/polish` → `/qa` |
| Conto | brief → architect (um movimento) → character → outline → scene → draft → critique → edit → continuity → qa |
| Capítulo novo num romance em curso | scene → (research) → draft → critique (scene) → continuity → polish |
| "Este diálogo soa falso" | `/dialogue` (skill) → G6 |
| Mudar a idade de uma personagem | protocolo de alterações: `cwos deps` → aprovação → atualizar → `/continuity` |
| Verificar um facto histórico | `/research` ou `/factcheck` |
| Copy narrativa | brief → voice → draft → critique (devils-advocate) → polish |
| Guião | como o conto ou o romance, com `PROJECT.md` a definir o formato (sluglines, didascálias) e o style guide a fixar as convenções |

## Protocolo de alterações de canon

```text
PROPOSTA → IMPACTO (cwos deps <id>) → APROVAÇÃO DO AUTOR → ATUALIZAR CANON
→ ATUALIZAR DEPENDÊNCIAS → REGISTAR (decisions.md) → CONTINUIDADE (cwos validate + /continuity)
→ cwos canon-diff (confirma que ficou registado)
```

## Orquestração de agents

A sessão principal é o orchestrator. Regras:

1. **Um agent chega?** Então usa só um. Tarefas pequenas fazem-se na sessão principal com a skill.
2. **Paralelismo só para análises independentes**, por exemplo `/critique tudo`, que lança `literary-editor`, `devils-advocate` e `continuity-editor` em paralelo.
3. **Os agents de crítica não escrevem no manuscrito.** Produzem relatórios e o orchestrator consolida-os.
4. **Consolidar** significa remover duplicados, assinalar conflitos (um agent diz "corta", outro "expande"), ordenar por severidade e deixar as decisões ao autor.
5. **Agents que escrevem** (`story-architect`, `character-editor`, `worldbuilding-editor`, `line-editor`, `researcher`) têm âmbitos de escrita separados, para não se sobreporem.

```text
ORCHESTRATOR (sessão principal)
 ├── story-architect ─────── story/
 ├── character-editor ────── characters/
 ├── worldbuilding-editor ── world/
 ├── researcher ──────────── research/
 ├── line-editor ─────────── manuscript/**/## Texto (POLISH)
 ├── scene-editor · dialogue-editor · literary-editor · continuity-editor · fact-checker ── editorial/reports/
 ├── devils-advocate ─────── (só leitura; devolve texto)
 └── quality-controller ──── editorial/qa/
```

## Versionamento

- Git é o histórico. Recomenda-se um commit por etapa concluída: `<slug>: <etapa> — <resumo>`.
- `cwos canon-diff <ref>` compara os estados de canon com qualquer commit.
- Para comparar versões de texto: `git diff --word-diff <ref> -- escrita/projetos/<slug>/manuscript/`.
- Versões paralelas que o autor quer manter ficam em `manuscript/drafts/`, que o `cwos` ignora.
- Entregas: `git tag <slug>-v1`.
