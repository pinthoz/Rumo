# Canon Index

> Gerado por `node scripts/cwos.mjs index` em 2026-09-16 para `o-livro-de-registos`. Não editar à mão — edita os ficheiros de origem.

**24 entidades** — CANON 10 · PROVISIONAL 8 · PROPOSTA 1 · REJEITADO 0 · RETCON 0

## character

| id | nome | status | ficheiro | depende de | referido por |
|---|---|---|---|---|---|
| char-artur | Artur Moura / Artur / Dr. Moura | CANON | [characters/char-artur.md](../characters/char-artur.md) | loc-farmacia-moura | char-ines, sc-01, ev-nasc-artur, ev-registos-1996, ev-morte-artur |
| char-ines | Inês Moura / Inês | PROVISIONAL | [characters/char-ines.md](../characters/char-ines.md) | char-artur, loc-farmacia-moura | sc-01, sc-02, ev-nasc-ines, ev-registos-1996, ev-inventario, ev-visita-lurdes |
| char-joaquim | Joaquim Sequeira / Joaquim | CANON | [characters/char-joaquim.md](../characters/char-joaquim.md) | — | char-lurdes, sc-01, ev-registos-1996, ev-morte-joaquim |
| char-lurdes | Lurdes Sequeira / Lurdes / D. Lurdes | PROVISIONAL | [characters/char-lurdes.md](../characters/char-lurdes.md) | char-joaquim | sc-01, sc-02, ev-morte-joaquim, ev-visita-lurdes |

## doc

| id | nome | status | ficheiro | depende de | referido por |
|---|---|---|---|---|---|
| brief | brief | CANON | [project/brief.md](../project/brief.md) | — | premise |
| outline | outline | PROVISIONAL | [story/outline.md](../story/outline.md) | premise | — |
| premise | premise | CANON | [story/premise.md](../story/premise.md) | brief | outline |
| project | O Livro de Registos | CANON | [PROJECT.md](../PROJECT.md) | — | — |
| sources | sources | PROVISIONAL | [research/sources.md](../research/sources.md) | — | — |
| style-guide | style-guide | PROVISIONAL | [project/style-guide.md](../project/style-guide.md) | — | — |
| timeline | timeline | PROVISIONAL | [story/timeline.md](../story/timeline.md) | — | — |

## event

| id | nome | status | ficheiro | depende de | referido por |
|---|---|---|---|---|---|
| ev-nasc-artur | Nascimento de Artur Moura | CANON | [story/timeline.md](../story/timeline.md) | char-artur | — |
| ev-nasc-ines | Nascimento de Inês Moura | CANON | [story/timeline.md](../story/timeline.md) | char-ines | — |
| ev-registos-1996 | Artur dispensa morfina a Joaquim acima do receitado; Inês (24 anos) escreve algumas entradas por ditado, nas férias de Natal | CANON | [story/timeline.md](../story/timeline.md) | char-artur, char-ines, char-joaquim, loc-farmacia-moura | sc-01 |
| ev-morte-joaquim | Joaquim morre em casa | CANON | [story/timeline.md](../story/timeline.md) | char-joaquim, char-lurdes | — |
| ev-morte-artur | Morte de Artur, aos 83 anos | CANON | [story/timeline.md](../story/timeline.md) | char-artur | — |
| ev-inventario | Inês faz o inventário e encontra o livro | PROVISIONAL | [story/timeline.md](../story/timeline.md) | char-ines, loc-farmacia-moura | sc-01 |
| ev-visita-lurdes | D. Lurdes visita a farmácia | PROPOSTA | [story/timeline.md](../story/timeline.md) | char-ines, char-lurdes, loc-farmacia-moura | sc-02 |

## fact

| id | nome | confiança | ficheiro | depende de | referido por |
|---|---|---|---|---|---|
| fact-encerramento-farmacia | Encerramento de farmácia: stocks controlados e registos | UNCERTAIN | [research/notes/fact-encerramento-farmacia.md](../research/notes/fact-encerramento-farmacia.md) | — | loc-farmacia-moura |
| fact-morfina-ambulatorio-1996 | Morfina em ambulatório dispensada em farmácia comunitária (Portugal, 1996) | UNCERTAIN | [research/notes/fact-morfina-ambulatorio-1996.md](../research/notes/fact-morfina-ambulatorio-1996.md) | — | sc-01 |
| fact-registo-estupefacientes | Registo de estupefacientes e psicotrópicos nas farmácias | LIKELY | [research/notes/fact-registo-estupefacientes.md](../research/notes/fact-registo-estupefacientes.md) | — | sc-01, loc-farmacia-moura |

## location

| id | nome | status | ficheiro | depende de | referido por |
|---|---|---|---|---|---|
| loc-farmacia-moura | Farmácia Moura | PROVISIONAL | [world/loc-farmacia-moura.md](../world/loc-farmacia-moura.md) | fact-registo-estupefacientes, fact-encerramento-farmacia | char-artur, char-ines, sc-01, sc-02, ev-registos-1996, ev-inventario, ev-visita-lurdes |

## scene

| id | nome | stage | ficheiro | depende de | referido por |
|---|---|---|---|---|---|
| sc-01 | O cofre | revisto | [manuscript/scenes/sc-01.md](../manuscript/scenes/sc-01.md) | char-ines, char-ines, char-artur, char-joaquim, char-lurdes, loc-farmacia-moura, ev-inventario, ev-registos-1996, fact-registo-estupefacientes, fact-morfina-ambulatorio-1996 | sc-02 |
| sc-02 | A visita | rascunho | [manuscript/scenes/sc-02.md](../manuscript/scenes/sc-02.md) | char-ines, char-ines, char-lurdes, loc-farmacia-moura, sc-01, ev-visita-lurdes | — |
