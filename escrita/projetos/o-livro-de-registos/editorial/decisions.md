# Registo de decisões

> Uma entrada por decisão do autor que cria, altera ou rejeita canon. Mais recente no topo.
> `cwos canon-diff` falha se um id passar a CANON / RETCON / REJEITADO sem aparecer aqui.
> **Projeto de demonstração:** as aprovações abaixo foram **simuladas** pelo orchestrator para testar o sistema; não houve autor humano a decidir.

## 2026-09-16 — Revisão de sc-01 após /critique (aprovação simulada)
- **Ids:** char-joaquim, char-ines, sc-01, loc-farmacia-moura, premise
- **Decisão:**
  - premissa (CANON): "o livro" passa a "os dois livros" (QA Q1);
  - sc-01: Lurdes "quase todos os dias" (Q3), a montra apaga-se às 21h (Q2) e `char-lurdes` fica declarada no frontmatter (Q5);
  - **pendente para o autor real:** as ampolas de morfina em 1996 continuam UNCERTAIN (factcheck F1c); a opção por omissão é manter e assinalar;
  - idade de Inês em 1996 mantém-se **24** (canon); o texto é corrigido;
  - APPEARANCE de char-joaquim alterada de "só nome" para "nome e memória" (mantém-se CANON);
  - os registos de 1996 passam a ser **dois livros** (movimentos e receitas);
  - o gabinete tem porta envidraçada para a montra;
  - a frase que anulava as consequências (l. 69) fica em aberto (opção A do literary-editor);
  - D. Amélia fica como figurante PROPOSTA, sem ficha;
  - "sair sem ter pago" é uma pista deliberada.
- **Impacto analisado:** `cwos deps char-joaquim` → char-lurdes, sc-01, sc-02, ev-registos-1996, ev-morte-joaquim (sem efeito material).
- **Conflito entre agents por decidir:** "Achara que era confiança." (o devils-advocate propõe cortar; o literary-editor pede para preservar) → **mantida**.
- **Aprovado por:** autor (simulado)

## 2026-09-16 — Fundamentos do conto (aprovação simulada)
- **Ids:** project, brief, premise
- **Decisão:** PROPOSTA → CANON
- **Motivo:** direção, pergunta dramática e premissa aceites para avançar para outline e draft.
- **Impacto analisado:** projeto novo; sem dependentes.
- **Pendente:** o final (opções A, B e C em `story/premise.md`).
- **Aprovado por:** autor (simulado)

## 2026-09-16 — Passado fixo (aprovação simulada)
- **Ids:** char-artur, char-joaquim, ev-nasc-artur, ev-nasc-ines, ev-registos-1996, ev-morte-joaquim, ev-morte-artur
- **Decisão:** PROPOSTA → CANON
- **Motivo:** o passado tem de ser estável antes do draft: datas de nascimento e de morte, e as dispensas irregulares de out–dez 1996, com Inês (24 anos) a escrever entradas por ditado.
- **Impacto analisado:** `cwos deps char-artur` → char-ines, loc-farmacia-moura, sc-01.
- **Aprovado por:** autor (simulado)

## 2026-09-16 — Lacuna de pesquisa (aprovação simulada)
- **Ids:** fact-encerramento-farmacia
- **Decisão:** o procedimento legal de encerramento (destino dos stocks e dos livros) fica **vago** no texto; não se ficciona um procedimento concreto.
- **Motivo:** facto "não encontrado" pelo researcher.
- **Aprovado por:** autor (simulado)
