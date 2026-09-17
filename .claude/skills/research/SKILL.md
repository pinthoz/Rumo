---
name: research
description: Pesquisa assuntos necessários à obra (história, lugares, profissões, ciência, cultura) com múltiplas fontes, avaliação de qualidade e nível de confiança, e documenta em research/notes. Usar quando uma cena ou elemento depende do mundo real. Modo RESEARCH.
argument-hint: "[pergunta]"
---
# research

## Propósito
Dar à obra uma base factual rastreável: QUESTION → RESEARCH → MULTIPLE SOURCES → SOURCE QUALITY → FACT → CONFIDENCE → STORY APPLICATION.

## Quando usar
- O outline ou a cena dependem de factos reais: procedimentos, lugares, datas, profissões, leis, linguagem de época.
- Um worldbuilding realista precisa de fundamento.

## Quando NÃO usar
- Detalhes puramente ficcionais.
- Verificar uma afirmação já escrita: usa `fact-check`, que é mais rápido e focado.

## Ferramentas
- **WebSearch / WebFetch** (essenciais): pesquisa e leitura de fontes.
- Outros MCPs só se estiverem disponíveis e tiverem função clara (ver `escrita/docs/mcp.md`). Consensus, por exemplo, para literatura científica, depois de autenticado.
- Sem acesso web: di-lo, e marca tudo como `UNCERTAIN` e "não verificado".

## Processo
0. **Âmbito:** uma pergunta simples resolve-se aqui. Várias perguntas, ou pesquisa com muitas fontes, delegam-se no agent `researcher` (um por tema, em paralelo, só se os temas forem independentes), para não encher o contexto principal.
1. Formula **perguntas concretas** e explica porque importam à história. Uma pergunta vaga produz pesquisa vaga.
2. Procura pelo menos **duas fontes independentes** por facto relevante. Prioridade de qualidade:
   1. fontes primárias e oficiais (legislação, arquivos, instituições);
   2. académicas;
   3. imprensa de referência;
   4. enciclopédias;
   5. blogues e fóruns, só como pista.
3. **Uma nota por tema** (uma pergunta ou um grupo de perguntas sobre o mesmo assunto), com vários factos: `cwos add fact fact-<tema> "Título"`. A nota contém:
   - FINDINGS com a fonte **e a confiança de cada afirmação**;
   - SOURCES com a qualidade;
   - CONFIDENCE.

   Critérios de confiança:
   - `VERIFIED`: duas ou mais fontes fiáveis independentes concordam, **ou** há uma fonte primária oficial inequívoca (por exemplo, o texto legal consolidado lido diretamente);
   - `LIKELY`: uma fonte fiável, ou uma leitura interpretativa de fonte primária;
   - `UNCERTAIN`: há indícios, mas não há confirmação;
   - `FICTIONALIZED`: o autor decidiu desviar-se.

   O `confidence` do frontmatter é o **nível mais baixo entre os factos essenciais** da nota.
4. Acrescenta as fontes a `research/sources.md` com ids `S1, S2…`. O campo `sources:` da nota lista esses ids.
   - **"Não encontrado":** procuraste e nenhuma fonte responde.
   - **"Não verificado (fonte ilegível)":** a fonte existe mas não foi possível lê-la. Regista-a na mesma.
5. **STORY APPLICATION:** como o facto serve a cena e o que pode ser ficcionado sem prejuízo.
6. Ligações: `facts: [fact-x]` nas cenas e `depends_on` nas entidades. Na sessão principal, faz a ligação. O agent `researcher` apenas **sugere** as ligações, porque não edita a bible.
7. **Nunca** preenchas lacunas com plausibilidades apresentadas como factos. Se não encontras, escreve "não encontrado".

## Output
Notas `fact-*` e um resumo com os factos, a confiança de cada um e as implicações para a história.

## Critérios de qualidade
- Cada afirmação tem uma fonte com URL ou referência.
- A confiança é justificada.
- As datas de acesso estão registadas.
- Não há citações longas de fontes com direitos.

## Dependências
`escrita/templates/research-note.md`, WebSearch/WebFetch. Agent: `researcher`.
