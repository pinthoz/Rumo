---
name: literary-analysis
description: Analisa textos de referência (técnica, estrutura, efeitos, voz) para extrair lições aplicáveis ao projeto, sem copiar nem imitar a voz de autores vivos. Usar quando o autor fornece referências ou pergunta "como é que X consegue Y".
argument-hint: "[obra/trecho de referência] [pergunta]"
---
# literary-analysis

## Propósito
Transformar referências em princípios técnicos abstratos, reutilizáveis pelo projeto.

## Quando usar
- O autor partilha uma obra ou um trecho de referência.
- Ao definir a direção criativa ou o style guide.

## Quando NÃO usar
- Para produzir pastiches de autores vivos. Recusa e oferece a análise abstrata.
- Para criticar o manuscrito do próprio projeto: usa os agents de crítica.

## Processo
1. Define a pergunta: que efeito interessa ao autor (tensão, intimidade, humor, ritmo…)?
2. Analisa **como** o efeito é produzido, em termos técnicos:
   - estrutura e ordem da informação;
   - focalização e distância;
   - sintaxe e cadência;
   - seleção de detalhe;
   - subtexto e elipse;
   - gestão de expectativa.
3. Cita **no máximo trechos curtos** (algumas palavras a uma frase), só como evidência. Não reproduzas passagens extensas de obras protegidas.
4. Converte cada observação num **princípio abstrato** ("revelar a emoção através de um objeto banal manipulado com excesso de cuidado").
5. Mostra como o princípio se aplicaria ao projeto: ideia, não prosa final.
6. Para autores do domínio público, a imitação estilística é legítima se o autor o pedir. Para autores vivos, só características abstratas.

## Output
Uma tabela `| efeito | técnica | evidência | princípio abstrato | aplicação possível |`. Se o autor aprovar, os princípios entram no style guide (via `voice`).

## Critérios de qualidade
- Análise técnica e não apenas elogiosa.
- Princípios transferíveis.
- Nenhuma cópia de voz ou de texto.

## Dependências
`voice` (para integrar no style guide).
