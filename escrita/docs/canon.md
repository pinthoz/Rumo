# Canon

## Estados

| status | é verdade no universo? | quem define | pode ser usado no texto? |
|---|---|---|---|
| `CANON` | sim | **só o autor** | sim |
| `PROVISIONAL` | provisoriamente | autor ou IA com aprovação | sim, com cautela |
| `PROPOSTA` | não | IA ou brainstorming | só em rascunhos, declarado nas notas |
| `REJEITADO` | não | autor | **não** (`cwos validate` dá erro se uma cena o usar) |
| `RETCON` | já não | autor | não; indica `superseded_by` |

O manuscrito tem um ciclo separado: `stage: rascunho → revisto → final`.
**Draft ≠ canon:** escrever algo numa cena não o torna verdade. O facto passa a canon quando é registado na bible e aprovado.

Notas de pesquisa (`research/notes/fact-*`) usam `confidence: VERIFIED | LIKELY | UNCERTAIN | FICTIONALIZED`.

## Frontmatter

```yaml
---
id: char-ines            # único, minúsculas, com prefixo
type: character          # character | location | culture | institution | technology | history | object | scene | fact | doc
name: "Inês Moura"
aliases: [Inês]          # formas usadas no texto (o cwos mentions usa-as)
status: PROPOSTA
depends_on: [loc-farmacia-moura]
superseded_by:           # só em RETCON
updated: 2026-09-16
---
```

Campos de referência (verificados pelo `cwos validate` e usados pelo `deps` e pelo `context`): `depends_on`, `pov`, `characters`, `location`, `prev`, `events`, `facts`, `superseded_by`.

### Prefixos de id

| prefixo | tipo | pasta |
|---|---|---|
| `char-` | personagem | `characters/` |
| `loc-` `cul-` `inst-` `tech-` `hist-` `obj-` | mundo | `world/` (ou subpasta, no perfil universe) |
| `sc-` | cena | `manuscript/scenes/` |
| `ev-` | evento | linha de `story/timeline.md` |
| `fact-` | facto pesquisado | `research/notes/` |

Documentos únicos (`brief`, `premise`, `outline`, `timeline`, `structure`, `style-guide`, `world-rules`) usam `type: doc` e o id sem prefixo.

## Timeline

`story/timeline.md` é uma tabela, uma linha por evento e por ordem cronológica:

```markdown
| id | ord | quando | evento | personagens | local | status | fonte |
|---|---|---|---|---|---|---|---|
| ev-morte-pai | 20240302 | 2 mar 2024 | Morte de Artur | char-artur | loc-farmacia | CANON | premise |
```

O `ord` é numérico ou uma data ISO, e o `validate` avisa se a ordem não bater certo.

## Mecanismos

| necessidade | mecanismo |
|---|---|
| Índice de tudo | `cwos index` gera `editorial/canon-index.md` (entidades por tipo, estado, dependências e referências inversas) |
| Contradições estruturais | `cwos validate`: ids duplicados, referências partidas, estados inválidos, CANON assente em REJEITADO, ordem da timeline |
| Dependências e impacto | `cwos deps <id>`: dependências, impacto transitivo e menções no texto |
| Alterações | git + `cwos canon-diff <ref>` (mudanças de estado e edições de conteúdo em CANON; verifica se estão em `decisions.md`) |
| Decisões criativas | `editorial/decisions.md` (uma entrada por decisão, com os ids) |
| Informação obsoleta | status `RETCON` + `superseded_by`; material descartado em `archive/` |
| Nomes e grafias | `cwos mentions`: nomes não indexados, "Inês ≈ Ines", entidades não-CANON usadas no texto, entidades mencionadas mas não declaradas no frontmatter da cena |

## Regras

1. Tudo o que a IA cria nasce `PROPOSTA`.
2. Só o autor promove. Cada promoção, e cada edição de conteúdo numa entidade CANON, leva uma entrada em `decisions.md`.
3. Uma entidade CANON não deve depender de uma PROPOSTA (o `validate` avisa).
4. Nunca se apaga: rejeita-se, faz-se retcon ou arquiva-se.
5. Alterações a CANON seguem o protocolo do `CLAUDE.md` (impacto, aprovação, atualização, continuidade).
6. Um ficheiro pode ter partes aprovadas e partes em proposta. A secção `CANON STATUS` das fichas diz quais são. O `status` do frontmatter reflete o estado **mínimo** garantido.
