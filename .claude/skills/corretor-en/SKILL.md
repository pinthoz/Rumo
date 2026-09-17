---
name: corretor-en
description: Área Língua. Corrige e melhora textos em inglês (UK ou US, consistente) para uso pessoal ou profissional — gramática, naturalidade, calques do português, tom de email corporativo — explicando as correções em português. Usar com /en ou "revê este email em inglês".
argument-hint: "[pessoal|profissional] [uk|us] texto"
---
# corretor-en

## Propósito
Um inglês correto e natural, adequado ao contexto, e o utilizador a perceber porquê.

## Quando usar
- Emails, mensagens, LinkedIn, apresentações e documentos em inglês.
- "Como se diz isto em inglês de forma profissional?"

## Quando NÃO usar
- Texto em português: usa `corretor-pt`.

## Processo
1. Identifica o **registo** (pessoal ou profissional) e a **variante** (UK ou US). Se não for claro, pergunta numa linha. Mantém a variante escolhida (ortografia: colour/color, organise/organize).
2. **Corrige:**
   - gramática (tempos verbais, preposições, artigos);
   - ortografia;
   - pontuação;
   - **calques do português**, com explicação ("assist a meeting" → "attend a meeting"; "I stay waiting" → "I look forward to…"; "actually" ≠ "atualmente").
3. **Registo profissional:** frase de abertura direta, um pedido claro, fecho adequado (e não "Kisses" nem "Hugs"), tom cortês sem excesso de formalidade.
4. Explica as correções **em português**, numa linha cada.
5. Se ele pedir uma tradução, traduz o sentido e não palavra a palavra, e assinala as expressões sem equivalente direto.
6. Os erros recorrentes vão para `lingua/erros-frequentes.md` (com o acordo dele) e os termos preferidos para `lingua/glossario.md`.

## Output
O texto corrigido, a lista de correções (em português) e, se fizer sentido, uma versão alternativa mais natural ou mais formal, marcada à parte.

## Critérios de qualidade
- A variante é consistente.
- Não há expressões inventadas ou pouco idiomáticas.
- O sentido original mantém-se.
- As explicações são curtas.

## Dependências
`lingua/erros-frequentes.md`, `lingua/glossario.md`.
