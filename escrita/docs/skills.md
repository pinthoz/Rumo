# Skills

As skills estão em `.claude/skills/<nome>/SKILL.md`. Cada uma tem propósito, quando usar, quando NÃO usar, inputs, processo, output, critérios de qualidade, exemplo e dependências. Podem ser invocadas por `/nome`, ou escolhidas automaticamente pelo Claude a partir da `description`.

| skill | modo | para quê | ferramentas `cwos` |
|---|---|---|---|
| `creative-brief` | DISCOVER | ideia → brief | new |
| `story-architecture` | ARCHITECT | premissa, estrutura, beats, outline | add scene, validate |
| `character-development` | ARCHITECT | fichas de personagem | add character, deps |
| `worldbuilding` | ARCHITECT | mundo com função narrativa | add location…, validate |
| `scene-design` | ARCHITECT | scene sheets | add scene, context |
| `creative-writing` | DRAFT | prosa segundo o protocolo | context, cliches, mentions, wc |
| `dialogue` | DRAFT/EDIT | voz, subtexto, exposição | — |
| `pacing` | CRITIQUE/EDIT | ritmo macro, meso e micro | style, wc |
| `voice` | POLISH | style guide medido; desvios | style |
| `show-dont-tell` | EDIT | escolha do modo narrativo | — |
| `editing` | EDIT | revisão por níveis | — |
| `line-editing` | POLISH | edição de linha | style, cliches |
| `continuity-check` | CONTINUITY | inconsistências | validate, mentions, deps, canon-diff |
| `research` | RESEARCH | pesquisa com fontes | add fact |
| `fact-check` | RESEARCH | verificação de afirmações | — |
| `literary-analysis` | DISCOVER | lições técnicas de referências | — |
| `sensitivity-review` | CRITIQUE | representação e riscos | — |
| `final-manuscript` | FINAL | montagem e entrega | todos |

## Regras de escrita de skills

- **Não repetir o CLAUDE.md.** Severidades, formato de crítica, estados de canon e gates estão definidos uma vez e as skills referem-nos.
- **Tarefas mecânicas no script.** Se um passo pode ser verificado deterministicamente, deve existir (ou ser criado) um comando `cwos`.
- **"Quando NÃO usar" é obrigatório.** Evita que o modelo escolha a skill errada.
- **A description decide o carregamento automático:** deve dizer o que a skill faz e quando se usa.
- Skills novas ou alteradas podem exigir uma nova sessão para ficarem disponíveis.

## Criar uma skill nova

1. `mkdir .claude/skills/<nome>` e cria `SKILL.md` com frontmatter (`name`, `description`, `argument-hint` opcional).
2. Segue as secções acima.
3. Se for um procedimento de um agent, acrescenta-a ao `skills:` desse agent.
4. Atualiza esta tabela.
