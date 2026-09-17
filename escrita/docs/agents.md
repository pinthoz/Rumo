# Agents

Os agents estão em `.claude/agents/`. Cada um tem missão, competências, contexto necessário, ferramentas autorizadas, procedimento, output, critérios de sucesso e limitações. O *procedimento* vem das skills pré-carregadas (campo `skills:`).

| agent | missão | skills | escreve em | reescreve texto? |
|---|---|---|---|---|
| `story-architect` | arquitetura narrativa | story-architecture, scene-design | `story/`, scene sheets | não (só prosa se pedido) |
| `character-editor` | personagens e arcos | character-development | `characters/`, relatórios | não |
| `worldbuilding-editor` | coerência do mundo | worldbuilding | `world/`, relatórios | não |
| `scene-editor` | análise de cenas | scene-design, pacing, show-dont-tell | relatórios | não |
| `dialogue-editor` | análise de diálogos | dialogue | relatórios | não (sugestões pontuais) |
| `literary-editor` | crítica global | editing, voice, pacing, sensitivity-review | relatórios | não |
| `line-editor` | edição de linha | line-editing, voice | `## Texto` das cenas | **sim** (só linha) |
| `continuity-editor` | inconsistências | continuity-check | relatórios, canon-index | não |
| `researcher` | pesquisa com fontes | research | `research/` | não |
| `fact-checker` | verificação factual | fact-check | `research/notes`, relatórios | não |
| `devils-advocate` | encontrar fraquezas | story-architecture | nada (só leitura) | não |
| `quality-controller` | QA e gates | — (procedimento próprio) | `editorial/qa/` | não |

## Quando usar cada um

- **Não usar agent:** tarefas pequenas e conversacionais (uma ficha, uma cena, uma pergunta). A skill na sessão principal chega e mantém o autor no circuito.
- **Usar agent:** análise extensa que encheria o contexto principal (crítica de um manuscrito, continuidade global, pesquisa com muitas fontes), ou quando se quer uma perspetiva independente (devils-advocate, QA).

## Como invocar

- Por comando: `/critique`, `/continuity`, `/factcheck`, `/polish` e `/qa` delegam nos agents; `/research` (skill) delega no `researcher` quando a pesquisa é extensa.
- Diretamente: "usa o agent continuity-editor sobre sc-03".
- Os agents novos ou alterados só ficam disponíveis numa nova sessão do Claude Code.

## Conflitos entre agents

Os âmbitos de escrita não se sobrepõem. Quando as recomendações colidem (por exemplo, o `scene-editor` sugere cortar uma memória que o `character-editor` considera essencial ao arco), o orchestrator **não escolhe**: apresenta o conflito ao autor com as duas justificações.

## Criar um agent novo

1. Confirma que nenhum agent existente cobre a função e que uma skill não chega.
2. Copia a estrutura de um existente. `tools` deve ter o mínimo necessário, e `skills` deve referir as skills em vez de copiar procedimento.
3. Atualiza esta tabela e `escrita/docs/workflow.md`.
