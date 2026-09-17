---
name: character-development
description: Desenvolve personagens com desejo, necessidade, medo, contradições, feridas, valores, relações, arco, voz, comportamento e conhecimento. Usar para criar ou aprofundar uma ficha, ou quando uma personagem age de forma inconsistente ou plana. Modo ARCHITECT.
argument-hint: "[char-id ou nome]"
---
# character-development

## Propósito
Criar personagens que geram conflito por si mesmas e cujo comportamento é previsível *a posteriori*, sem nunca ser previsível *a priori*.

## Quando usar
- Personagem nova ou ficha incompleta.
- Diagnóstico G3 (a personagem age contra o que se sabe dela) ou arco plano.

## Quando NÃO usar
- Só a voz dos diálogos está fraca: usa `dialogue`.
- Personagem figurante sem função recorrente: basta uma linha no outline, sem ficha.

## Inputs
Ficha existente (`characters/<id>.md`), `story/premise.md`, e as fichas das personagens com quem se relaciona, lidas apenas na secção RELATIONSHIPS.

## Processo
1. Ficha nova: `cwos add character char-<nome> "Nome Completo"`. Preenche `aliases` com as formas curtas usadas no texto, que o `cwos mentions` precisa para as detetar.
2. Define o triângulo **desejo** (externo, consciente) / **necessidade** (interna) / **medo**. O conflito entre desejo e necessidade é o motor do arco.
3. Define a **ferida** (a origem do medo) e **uma contradição** concreta, observável em comportamento.
4. Escreve os **valores** em hierarquia: qual cede primeiro sob pressão?
5. **Relações:** para cada uma, que tensão gera. Usa ids.
6. **Voz:** ritmo de fala, léxico, o que nunca diria, e uma fala-exemplo.
7. **Knowledge:** o que sabe e desde quando (id de cena ou evento). É essencial para a continuidade.
8. **Arco:** início, ponto de rutura e fim, alinhados com `story/structure.md`.
9. Mantém `status: PROPOSTA`. Na secção CANON STATUS, indica que partes já foram aprovadas.
10. Se a alteração toca numa personagem CANON, aplica o protocolo de alterações do CLAUDE.md (`cwos deps <id>`).

## Output
Ficha em `characters/`. Resumo com o triângulo desejo/necessidade/medo, o arco numa linha e as perguntas para o autor.

## Critérios de qualidade
- O desejo e a necessidade estão em tensão real.
- A contradição aparece em ação, não só em descrição.
- A aparência inclui apenas traços com função.
- A voz é distinguível sem etiqueta de diálogo.
- Não há estereótipos não intencionais (em caso de dúvida, usa `sensitivity-review`).

## Exemplo
**Desejo:** encerrar a farmácia do pai sem escândalo. **Necessidade:** admitir que também foi cúmplice do silêncio. **Medo:** ser igual ao pai.

## Dependências
`escrita/templates/character.md`, `cwos add`, `cwos deps`. Agent: `character-editor`.
