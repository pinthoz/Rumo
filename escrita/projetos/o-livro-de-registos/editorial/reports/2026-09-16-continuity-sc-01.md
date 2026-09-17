---
type: report
title: "continuity-sc-01"
scope: manuscript/scenes/sc-01.md (+ impacto em sc-02)
agent: continuity-editor
date: 2026-09-16
---
# Relatório editorial — continuity-sc-01

[MODE: CONTINUITY]

> Âmbito: `manuscript/scenes/sc-01.md` (scene sheet + texto); impacto G10 em `manuscript/scenes/sc-02.md` · Canon consultado: char-artur, char-joaquim, ev-nasc-artur, ev-nasc-ines, ev-registos-1996, ev-morte-joaquim, ev-morte-artur, premise, project (CANON); char-ines, char-lurdes, loc-farmacia-moura, ev-inventario, timeline, outline (PROVISIONAL); ev-visita-lurdes (PROPOSTA); fact-registo-estupefacientes (LIKELY), fact-encerramento-farmacia (UNCERTAIN); `editorial/decisions.md`.
> Cada ponto: **[P0–P3] [OBJETIVO|PREFERÊNCIA|INTERPRETAÇÃO|HIPÓTESE]** Observação → Evidência → Impacto → Causa provável → Opções
> Autoridade (CLAUDE.md): 1 autor · 2 CANON · 3 brief/PROJECT · 4 bible · 5 style guide · 6 research · 7 inferência IA · 8 sugestão IA. O manuscrito não tem nível próprio: escrever numa cena não torna nada canon.

## SUMMARY

| sev | n.º |
|---|---|
| P0 | 2 |
| P1 | 2 |
| P2 | 9 |
| P3 | 1 |

Os dois P0 são: a idade de Inês em dezembro de 1996 (22 no texto, 24 no canon) e Joaquim evocado fisicamente numa memória, quando a ficha CANON diz que ele "só aparece como nome no livro" (este último depende de como se lê essa linha da ficha; ver C2). A cronologia (datas das entradas antes da morte de Joaquim, idade de Artur, intervalo desde a morte dele, data do inventário) está coerente.

### Saídas automáticas (citadas)

```text
$ node scripts/cwos.mjs validate
o-livro-de-registos: 23 entidades · 0 erro(s) · 0 aviso(s)

$ node scripts/cwos.mjs mentions projects/o-livro-de-registos/manuscript/scenes/sc-01.md
Menções por entidade:
  char-artur               —
  char-ines                manuscript/scenes/sc-01.md×6  ⚠ PROVISIONAL
  char-joaquim             manuscript/scenes/sc-01.md×2
  char-lurdes              —
  loc-farmacia-moura       —
Nomes próprios não indexados (fora de início de frase):
  Estupefacientes, Lourdes, Matemática, Natal, Amélia   (sc-01.md)
Grafias possivelmente inconsistentes:
  Lurdes ≈ Lourdes

$ node scripts/cwos.mjs canon-diff
0 alteração(ões) de estado desde HEAD; 0 sem registo de decisão.

$ node scripts/cwos.mjs deps sc-01
Impacto: 1. sc-02 via prev → sc-01 [rascunho]
Menções textuais ("O cofre"): story/outline.md l.7; story/premise.md l.19
```

Leitura das saídas:
- `char-artur —`: o texto nunca o nomeia ("o pai"), por isso a contagem é 0. Não é um problema.
- `char-lurdes —`: a personagem aparece, mas com a grafia "Lourdes" (C3).
- `Estupefacientes`, `Matemática` e `Natal` são falsos positivos (título do livro, disciplina, festa). `Amélia` é uma personagem nova (lista de PROPOSTAS).
- `deps` para ev-registos-1996, ev-inventario e char-lurdes: a cadeia de impacto é sempre sc-01 → sc-02. Não há outras cenas.

## CRITICAL ISSUES

**C1 — [P0] [OBJETIVO] Idade de Inês no Natal de 1996**
- Observação: o texto diz que Inês tinha 22 anos; o canon diz 24.
- Evidência: `sc-01.md:61` "Tinha vinte e dois anos nesse Natal." ↔ `story/timeline.md:15` ev-nasc-ines (CANON, 15 mar 1972) e `story/timeline.md:16` ev-registos-1996 (CANON, "Inês (24 anos)"); também `characters/char-ines.md:14` (a secção CANON STATUS, l.68, declara a idade CANON) e a própria scene sheet, `sc-01.md:31`.
- Impacto: quebra de canon (G1). Com 22 anos, ela teria nascido em 1974, o que também contradiz os "52 anos em maio de 2024".
- Causa provável: gralha de draft.
- Opções: (a) alinhar o texto com o canon (24); (b) se o autor quiser 22, é uma ⚠ ALTERAÇÃO DE CANON: muda ev-nasc-ines e ev-registos-1996, pede `cwos deps` e fica registada em decisions.md.

**C2 — [P0] [INTERPRETAÇÃO] Joaquim com presença física na memória de Inês**
- Observação: a cena dá a Joaquim chapéu, mota e tabaco; a ficha CANON limita-o ao nome no livro.
- Evidência: `sc-01.md:51` "Lembrava-se do chapéu, da mota que ele deixava a trabalhar à porta enquanto comprava o tabaco…" ↔ `characters/char-joaquim.md:18` (CANON) "Só aparece como nome no livro." A scene sheet (`sc-01.md:21`) diz, pelo contrário, "ausentes: nome, letra, memória".
- Impacto: lida à letra, é uma contradição com CANON. Se a linha da ficha for uma nota sobre a economia narrativa ("ficha mínima de propósito", l.60) e não um facto do mundo, desce para P2.
- Causa provável: a scene sheet (sem autoridade de bible) alargou a presença de Joaquim sem atualizar a ficha.
- Opções: (a) cortar os traços físicos e deixar só o nome; (b) o autor aprova a presença por memória e a ficha é atualizada (os traços entram como PROPOSTA e a alteração fica registada); (c) o autor esclarece que a linha é meta e não canon de mundo.

## STRUCTURAL ISSUES

**S1 — [P1] [INTERPRETAÇÃO] Gabinete "sem janelas" que escurece com o fim do dia**
- Evidência: `sc-01.md:67` "naquele gabinete sem janelas" ↔ `sc-01.md:41` "Faltava uma hora para escurecer", `sc-01.md:71` "Lá fora, alguém baixou uma persiana… a luz do gabinete acendia-se num interruptor… deixou que a sala escurecesse" e a saída da scene sheet, `sc-01.md:30` ("sentada no escuro, sem acender a luz"). A ficha `world/loc-farmacia-moura.md:18` (PROVISIONAL) não diz se o gabinete tem janelas.
- Impacto: se a luz elétrica está apagada e não há janelas, Inês não podia ler o livro, nem a sala podia "escurecer" com o fim da tarde. A imagem final depende disto.
- Opções: (a) o gabinete tem uma janela ou claraboia (entra na ficha do local como PROPOSTA); (b) a luz vem da farmácia pela porta aberta; (c) cortar "sem janelas".

**S2 — [P1] [INTERPRETAÇÃO] Só o livro de 1996 foi guardado; o pai "nunca deitava papéis fora"**
- Evidência: `sc-01.md:39` "onde deviam estar os livros seguintes, não havia nada. Só aquele." ↔ `characters/char-artur.md:49` (CANON) "Nunca deitava papéis fora."; `characters/char-ines.md:60` (PROVISIONAL, KNOWLEDGE) "que o pai guardava livros antigos no cofre" (no plural).
- Impacto: o texto sugere que Artur destruiu os outros livros (ou os guardou noutro sítio), o que choca com um traço CANON. Se o autor ler a passagem como destruição, isto passa a P0.
- Opções: (a) os outros livros estão noutro sítio (arquivo, cave), o que mantém o traço; (b) o autor aprova a exceção (guardou tudo menos os livros de registo, e deste guardou só um), com nota na ficha; (c) corrigir o KNOWLEDGE de char-ines para o singular.

## CHARACTER ISSUES
Ver C1, C2 e S2 acima, e C3 e C4 abaixo.

## PACING
Fora do âmbito (continuidade).

## DIALOGUE
Nenhum problema de continuidade. A fala `sc-01.md:63` coincide com a VOICE CANON de Artur (`char-artur.md:46`).

## STYLE
Fora do âmbito.

## CONTINUITY

| sev | onde | afirma | contradiz | autoridade | opções |
|---|---|---|---|---|---|
| P0 | sc-01.md:61 | Inês tinha 22 anos no Natal de 1996 | timeline.md:15-16; char-ines.md:14; sc-01.md:31 → 24 anos | manuscrito vs CANON (2) | ver C1 |
| P0 | sc-01.md:51 | memória física de Joaquim (chapéu, mota, tabaco) | char-joaquim.md:18 "Só aparece como nome no livro" | manuscrito vs CANON (2) | ver C2 |
| P1 | sc-01.md:67 | gabinete sem janelas | sc-01.md:41, 71 e scene sheet l.30 (escurecer, luz apagada) | interno ao manuscrito; loc (4) omissa | ver S1 |
| P1 | sc-01.md:39 | não há livros posteriores; só o de 1996 | char-artur.md:49 "Nunca deitava papéis fora"; char-ines.md:60 "livros" | manuscrito vs CANON (2) / bible PROVISIONAL (4) | ver S2 |
| P2 | sc-01.md:51 (C3) | "D. Lourdes" | char-lurdes.md:4-5 "Lurdes", "D. Lurdes"; style-guide l.25 (menção) | manuscrito vs bible PROVISIONAL (4) | uniformizar a grafia; acrescentar `char-lurdes` a `characters:` em sc-01.md:7 |
| P2 | sc-01.md:7 | frontmatter `characters` sem char-lurdes | sc-01.md:51 (Lurdes evocada) | metadados | acrescentar, ou decidir que as evocações não contam |
| P2 | sc-01.md:51 (C4) | Lurdes vinha duas vezes por semana e saía sem pagar | char-ines.md:62 (Inês só sabe "que D. Lurdes sabia" a partir de sc-02); sc-02.md:26, 29 | manuscrito vs bible PROVISIONAL (4) e scene sheet sc-02 | [INTERPRETAÇÃO] o pormenor antecipa a revelação de sc-02 (G10); o autor decide se é presságio intencional |
| P2 | sc-01.md:30 | ENTRADA: "com o cofre já aberto" | sc-01.md:35 "O cofre abriu à segunda tentativa" | scene sheet vs texto (mesmo ficheiro) | alinhar um com o outro |
| P2 | sc-01.md:39 | "o pai tivera vinte e oito anos" para destruir o livro | fact-registo-estupefacientes.md:28 (3 anos após o último lançamento → a partir de ~jan 2000; Artur morre a 11 fev 2024: cerca de 24 anos); timeline.md:18 | manuscrito vs research LIKELY (6) + CANON (2) | "vinte e quatro"; ou contar desde 1996 e mudar a formulação |
| P2 | sc-01.md:61 | o pai "com as receitas na mão, a ditar" | premise.md:26 (CANON) "a ditar números sem olhar para as receitas" | manuscrito vs CANON (2) | [INTERPRETAÇÃO] não é incompatível (segura-as, não as lê), mas o texto perde o "sem olhar"; o autor decide se o pormenor importa |
| P2 | sc-01.md:37 | duas caixas de ampolas ainda no cofre | loc-farmacia-moura.md:29 "os stocks já foram devolvidos aos fornecedores"; decisions.md "Lacuna de pesquisa" (manter o destino vago) | manuscrito vs bible PROVISIONAL (4); decisão do autor (simulada) | o texto não descreve procedimento, por isso a decisão é respeitada; a nota do local é que contradiz. Opções: tirar as ampolas; ou matizar a nota do local ("quase todos") |
| P2 | sc-02.md:31 ↔ sc-01.md:71 | sc-02: "o livro dormiu na mala de Inês" | sc-01 acaba com o livro em cima da secretária, debaixo das mãos dela | scene sheet sc-02 vs texto sc-01 | G10: não há contradição, mas há uma lacuna; sc-02 tem de mostrar ou implicar o gesto, ou sc-01 acrescenta-o |
| P3 | sc-01.md:59 | setes "como ela ainda os fazia, trinta anos depois" (desde o liceu) | char-ines.md:14 (nascida em 1972 → liceu ~1987–1990 → 34–37 anos até 2024) | manuscrito vs bible (4) | aproximação aceitável em discurso indireto livre; ou "mais de trinta anos" |

**Verificações sem problemas:**
- Artur: 2 abr 1940 a 11 fev 2024, 83 anos (`timeline.md:14, 18`); a morte ~3 meses antes de 20 mai 2024 coincide com `premise.md:14`; tinta azul (`char-artur.md:19`) coincide com `sc-01.md:59`.
- Entradas de Inês a 20, 22 e 26 dez 1996, antes da morte de Joaquim a 28 dez (`timeline.md:17`), e nas férias de Natal (ev-registos-1996). Ela era estudante (`char-ines.md:23`, licenciatura em 1997), o que bate com "Estava em casa para as férias".
- Irregularidades de out–dez (`sc-01.md:43-49`) coincidem com ev-registos-1996. Joaquim acamado no inverno coincide com `char-joaquim.md:14` e `char-lurdes.md:21`.
- 20 mai 2024, fim de tarde (`sc-01.md:19`) coincide com ev-inventario (`timeline.md:19`). Os óculos (`char-ines.md:19`) aparecem em `sc-01.md:39`. A profissão hospitalar coincide com `char-ines.md:15`.
- Fecho a 31 de dezembro, com diferenças, e rasura sem ressalva coincidem com `fact-registo-estupefacientes.md:21, 23` (VERIFIED).
- Notas de euro no cofre: plausível (Artur manteve a farmácia até 2024).
- Objetivo "seguir para Coimbra de manhã" (`sc-01.md:22`) vs sc-02 a 21 mai de manhã na farmácia (`sc-02.md:19`; ev-visita-lurdes, PROPOSTA): compatível se partir depois da visita. Fica só como nota.
- O dilema não recebe veredicto do narrador e a palavra eutanásia não aparece (restrições de `PROJECT.md`).

## FACTUAL ISSUES

| sev | onde | afirma | fonte | nota |
|---|---|---|---|---|
| P2 [HIPÓTESE] | sc-01.md:43 | páginas rubricadas "com a assinatura torta do inspetor da época" | fact-registo-estupefacientes.md:23 (VERIFIED): numeradas e rubricadas "pelo Instituto" (INFARMED) | "inspetor" não está documentado. Opções: "do Instituto", ou marcar FICTIONALIZED |
| P2 [OBJETIVO] | sc-01.md:37, 43 | um só livro, "Registo de Estupefacientes — 1996", com as colunas data/produto/entrada/saída/receita/adquirente | fact-registo-estupefacientes.md:21-22 (dois registos: movimentos, art. 32.º; receitas, art. 34.º); l.33, 61 (formato dos modelos anteriores a 1998 não encontrado: "desde que não se descreva o formato exato") | o texto funde os dois livros e descreve o formato. Opções: marcar FICTIONALIZED em decisions.md; ou tornar a descrição vaga |
| P3 [HIPÓTESE] | sc-01.md:39 | "a lei deixava deitá-lo fora" três anos depois | fact-registo-estupefacientes.md:28 (LIKELY; a aplicação às farmácias é uma leitura do investigador) | aceitável no ponto de vista de uma farmacêutica; fica registado como LIKELY, não VERIFIED |
| — | sc-01.md:69 | "provavelmente já nada daquilo tinha consequência" | fact-registo-estupefacientes.md:64 (prescrição não pesquisada) | a frase está modalizada ("provavelmente"), por isso é aceitável; não afirma um facto |

## Candidatas a PROPOSTA (invenções do texto que não estão na bible)
- A combinação do cofre é a data de nascimento de Inês (loc-farmacia-moura / char-artur).
- No cofre: envelope com notas de 5 € nunca depositadas; duas caixas de ampolas contadas, com o lote a lápis; etiqueta "Registo de Estupefacientes — 1996".
- Só o livro de 1996 está no cofre; os livros seguintes não estão lá (ver S2).
- Pormenor das dispensas: morfina de libertação prolongada e depois injetável; frequência mensal → quinzenal → semanal; número de receita repetido em novembro; rasura 4→9 em dezembro; saídas de dezembro = o dobro do receitado; zero nas diferenças a 31 dez, com a rubrica de Artur (ev-registos-1996).
- As entradas escritas por Inês têm datas: 20, 22 e 26 dez 1996.
- Letra: Inês corta os setes (ensinou-lho uma professora de Matemática no liceu) e escreve com números redondos e inclinados; os números de Artur são direitos.
- Artur corrigia os erros de ortografia das receitas dos médicos; pedia a Joaquim que não fumasse.
- Joaquim: chapéu, mota, fumador (ver C2).
- Lurdes: atravessava a rua (é vizinha em frente?) duas vezes por semana, com o saco de pano, e saía sem pagar.
- **D. Amélia:** empregada de balcão da farmácia, de baixa em dez 1996 (personagem nova, não indexada).
- Inês usa "folhas de requisição do hospital" e treina técnicos (char-ines).
- Gabinete sem janelas; interruptor junto à porta (loc-farmacia-moura; ver S1).
- Inês recupera em cena a memória do ditado ("uma coisa que não sabia que lembrava"), o que mexe no KNOWLEDGE de char-ines.

## STRENGTHS
- A cronologia está bem ancorada: as datas das entradas antes da morte de Joaquim e o fecho a 31 de dezembro respeitam o canon e a pesquisa VERIFIED.
- A fala de Artur e a tinta azul reutilizam o canon de forma exata.
- A cena respeita a decisão de manter vago o procedimento de encerramento.

## RECOMMENDATIONS
Por ordem de prioridade. **Não corrigi nada; as escolhas são do autor.**
1. Resolver C1 (22 vs 24).
2. Decidir o estatuto da linha "Só aparece como nome no livro" (C2).
3. Resolver a luz do gabinete (S1) e o destino dos outros livros (S2).
4. Uniformizar Lurdes/Lourdes e os metadados de sc-01.
5. Decidir que invenções passam da lista acima a PROPOSTA na bible (sobretudo D. Amélia e as datas 20/22/26 dez).
6. Registar como FICTIONALIZED o formato do livro e o "inspetor", ou tornar esses pormenores vagos.
7. Antes de escrever sc-02: o livro na mala (lacuna G10) e o peso de "saía sem ter pago" como presságio.

## Notas para o autor
- **Suposições feitas:** a secção "CANON STATUS" de char-ines (idade e datas CANON, apesar do `status: PROVISIONAL` do ficheiro) vale como canon para a idade. As aprovações em decisions.md, mesmo simuladas, contam como decisões do autor. As linhas da timeline com `status: CANON` são canon, embora o ficheiro `timeline.md` esteja PROVISIONAL.
- **Canon em que me apoiei:** ev-nasc-ines, ev-registos-1996, ev-morte-joaquim, ev-morte-artur, char-artur, char-joaquim, premise, PROJECT.
- **O que pode estar inconsistente:** ver a tabela acima. C2 e S2 dependem de interpretação.
- **O que inventei:** nada no manuscrito. As contas de anos (24 anos até à morte de Artur; 34–37 anos desde o liceu) são inferências (nível 7).
- **O que continua incerto:** se o gabinete tem janela; se o livro fundido é uma ficção deliberada. `world/rules.md` não existe neste projeto, por isso não houve regras do mundo a verificar.
- **O que cabe ao autor decidir:** tudo o que está em RECOMMENDATIONS, e o final (em aberto, não afetado por esta cena).
