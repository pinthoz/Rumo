---
name: sensitivity-review
description: Identifica representações potencialmente problemáticas, estereótipos, incoerências culturais e riscos de leitura, apresentando observações contextualizadas sem substituir a intenção artística. Usar em personagens/culturas fora da experiência do autor, temas sensíveis, ou antes da entrega.
argument-hint: "[ficheiro(s) ou entidade]"
---
# sensitivity-review

## Propósito
Dar ao autor informação para decidir de forma consciente. Não é censura nem reescrita automática.

## Quando usar
- Personagens de grupos marginalizados, culturas reais, deficiência, saúde mental, violência, trauma.
- Antes do QA final de obras com estes elementos.

## Quando NÃO usar
- Para neutralizar conteúdo difícil que é intencional e está previsto no `PROJECT.md` (limites de violência e explicitação).

## Processo
1. Lê os limites e a intenção em `PROJECT.md` e `project/brief.md`.
2. Procura:
   - estereótipos (personagem reduzida a um traço identitário; "tokenismo");
   - tropos com historial problemático (por exemplo, a morte da personagem LGBTQ+ para impulsionar outra, ou a deficiência "curada" como final feliz);
   - inexatidões culturais (nomes, práticas, língua): cruza com `fact-check`;
   - assimetria de interioridade (quem tem voz e quem é só cenário);
   - linguagem datada ou ofensiva *fora* da voz de uma personagem;
   - representação de temas sensíveis (suicídio, abuso) com riscos conhecidos, como o detalhe de método.
3. Para cada observação: a evidência, porque pode ser lida assim, **se parece intencional**, e as opções (manter com mais contexto, complexificar, alterar).
4. Distingue o preconceito de uma **personagem** (pode ser intencional e verosímil) do preconceito do **texto** (a narrativa valida-o sem o questionar).
5. Não substituas a experiência vivida: se o tema o justificar, recomenda leitores sensíveis humanos.

## Output
Uma secção no relatório editorial: `| observação | evidência | leitura possível | intencional? | opções |`. Severidade P1–P3, nunca P0 por gosto.

## Critérios de qualidade
- Tom informativo e não moralizante.
- Cada ponto tem evidência textual.
- A intenção artística é respeitada.

## Dependências
`PROJECT.md`, `fact-check`. Chamado por `literary-editor` ou diretamente.
