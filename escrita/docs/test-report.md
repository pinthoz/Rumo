# Relatório de teste end-to-end (2026-09-16)

O sistema foi testado com o projeto `escrita/projetos/o-livro-de-registos`, um conto de duas cenas. As aprovações do autor foram **simuladas** e estão marcadas como tal em `editorial/decisions.md`.

## Pipeline executado

| etapa | como | resultado |
|---|---|---|
| idea → brief | skill `creative-brief` (sessão principal) | `project/brief.md`, `PROJECT.md` |
| research | agent `researcher` | 2 notas `fact-*`, 6 fontes; a pergunta sobre o encerramento da farmácia ficou "não encontrado" (sem invenção) |
| architecture / character / world / outline | skills (sessão principal) + `cwos add` | premissa com 3 finais (A/B/C) por decidir; 4 personagens; 1 local; timeline com 7 eventos |
| scene | skill `scene-design` + `cwos context` | o contexto mínimo ficou limitado a 10 ficheiros |
| draft | skill `creative-writing` | sc-01 (718 palavras) com **3 erros semeados** |
| critique | agents `literary-editor`, `devils-advocate`, `continuity-editor` (em paralelo) | 3 relatórios |
| edit | skill `editing` + protocolo de alterações (`cwos deps`) | P0 e P1 resolvidos; 1 alteração de canon registada |
| fact check | agent `fact-checker` | F1c (ampolas de morfina em 1996) UNCERTAIN; o resto sem erros |
| polish | agent `line-editor` | parcial (interrompido pelo limite da API); alterações conservadoras aceites |
| final QA | agent `quality-controller` (nativo) | **APROVADO COM RESERVAS** |
| final | skill `final-manuscript` | não executada: a pré-condição falha (sc-02 sem texto). É o comportamento esperado |

Nota: os agents criados durante a sessão só ficaram disponíveis nativamente perto do fim. Antes disso foram executados por um agent genérico que carregava o ficheiro de definição e as skills respetivas.

## Deteção dos erros semeados

| erro | cwos | literary | continuity | devils |
|---|:-:|:-:|:-:|:-:|
| idade de Inês 22 (canon: 24) | — | ✅ | ✅ | ✅ |
| "Lourdes" ≠ "Lurdes" | ✅ (depois da correção do bug "D.") | ✅ | ✅ | ✅ |
| cliché "o tempo parou" | ✅ | ✅ | n/a | ✅ |

Os agents encontraram também problemas **não semeados**:

- luz impossível num gabinete sem janelas;
- "vinte e oito anos" quando deviam ser cerca de 24;
- o livro único, que contradizia "nunca deitava papéis fora";
- stakes externas anuladas por uma frase;
- lógica da fraude contabilística pouco clara;
- regime legal transitório em 1996.

## Problemas do sistema encontrados e corrigidos

| problema | origem | correção |
|---|---|---|
| `/research` colidia com a skill `research` | `system.test.mjs` | comando removido; a skill delega no agent |
| nome depois de "D." tratado como início de frase | demo | `mentions` reconhece títulos abreviados, com teste |
| números de linha relativos ao corpo e não ao ficheiro | devils-advocate | `proseOf` preserva as linhas; offset do frontmatter; teste |
| contagens duplicadas por `drafts/` e `export/` | revisão | pastas ignoradas; só `scenes/` e `chapters/` contam como prosa |
| `--help` e opções desconhecidas ignoradas | literary-editor | tratadas, com erro explícito |
| `canon-diff` ignorava edições de conteúdo em CANON | quality-controller | deteta alterações de conteúdo (ignora `updated`), com teste |
| registo em `decisions.md` satisfeito por menções antigas | demo | exige uma entrada nova desde `<ref>` |
| `index` obrigava a escrever fora do âmbito do QA | quality-controller | `index --check` |
| cena menciona uma personagem não declarada no frontmatter | quality-controller | `mentions` cruza texto e frontmatter |
| ids de fonte não verificados | researcher | o `validate` confirma `sources:` contra `research/sources.md` |
| critérios VERIFIED divergentes; confiança por nota; "não encontrado" vs "ilegível" | researcher, fact-checker | regras unificadas em `research` e `fact-check` e no CLAUDE.md |
| ferramentas do researcher e do fact-checker incoerentes | researcher, fact-checker | `Edit`, Bash para fontes e escrita em `research/` explícitos |
| CLAUDE.md dizia que todos os críticos escrevem relatórios | devils-advocate | exceção explícita |
| skills pré-carregadas de outro modo executadas à letra | vários | regra "skill como critério" no CLAUDE.md e notas nos agents |
| subagents não podem perguntar ao autor | vários | as perguntas passam para "Cabe ao autor decidir" |
| status do ficheiro vs status da secção ou da linha | continuity-editor | "o estado mais específico prevalece" |
| sobreposição continuidade / crítica | literary-editor, devils-advocate | a continuidade é do `continuity-editor`; os outros só a sinalizam |
| regra de veredicto do QA incompleta | quality-controller | P1 abertos, "facto essencial", aprovações simuladas |
| QA pré-carregava `continuity-check` | quality-controller | removido |
| templates sem SENSITIVITY, GATES, SUGESTÃO e self-check completo | literary-editor | templates atualizados |

## Avaliação

| critério | avaliação |
|---|---|
| agents chamados corretamente | sim; cada um respeitou o seu âmbito de escrita (os críticos não tocaram no manuscrito) |
| skills usadas corretamente | sim, com os ajustes de "skill como critério" acima |
| canon preservado | sim; as 2 edições de CANON foram detetadas e registadas (`canon-diff`) |
| alterações rastreáveis | git + `decisions.md` + relatórios em `editorial/reports/` |
| contexto evitado | `cwos context` limitou a leitura para escrever; os críticos ainda tendem a ler todas as fichas |
| MCPs | só WebSearch e WebFetch; nenhum MCP externo necessário |
| output consistente | os 3 críticos convergiram nos P0 e P1 |
| instruções duplicadas | detetadas e unificadas (critérios de confiança, etiquetas) |
| conflitos entre agents | 1 conflito real ("Achara que era confiança.": cortar vs preservar), apresentado ao autor |

## Em aberto

- Decisões do autor: o final (A/B/C), as ampolas (F1c), o alvo da média de frase e a sc-02.
- Os agents de crítica consomem cerca de 100 mil tokens cada; para cenas curtas, uma skill na sessão principal chega.
