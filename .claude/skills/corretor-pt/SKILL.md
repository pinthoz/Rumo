---
name: corretor-pt
description: Área Língua. Corrige textos em português europeu (ortografia AO90, gramática, pontuação, concordância, colocação pronominal) e, se pedido, adapta o registo pessoal ou profissional, explicando cada correção. Usar com /pt ou "corrige isto", "está bem escrito?".
argument-hint: "[pessoal|profissional] texto"
---
# corretor-pt

## Propósito
Um texto correto em pt-PT, com a voz do utilizador, e ele a aprender com os erros.

## Quando usar
- Emails, mensagens, publicações, documentos em português.

## Quando NÃO usar
- Texto em inglês: usa `corretor-en`.
- Revisão literária de um texto criativo (voz, ritmo narrativo): é da área Escrita (`line-editing`).

## Processo
1. Identifica o **registo**. Se não for claro, pergunta numa linha: "pessoal ou profissional?".
2. **Corrige apenas os erros:** ortografia (AO90), acentuação, concordância, regência, pontuação, colocação pronominal (pt-PT: ênclise por omissão; próclise com negação, advérbios, pronomes relativos…), "à / há / a", "hei de / há de" (sem hífen, pelo AO90), e brasileirismos quando o texto é pt-PT.
3. **Explica** cada correção numa linha, com a regra. Quando há variantes aceites, diz que ambas estão certas. Em dúvida real, cita uma fonte reconhecida (Ciberdúvidas, Portal da Língua Portuguesa, dicionário) ou marca `[Incerto]`.
4. **Estilo:** só se o registo o pedir (profissional: clareza, frases curtas, sem informalidades) ou se ele pedir. Nesse caso apresenta uma **versão alternativa** à parte, sem substituir a correção.
5. Consulta `lingua/erros-frequentes.md`. Se um erro já lá estiver, diz "este é recorrente". Com o acordo dele, acrescenta ou incrementa a linha.

## Output
```
Texto corrigido:
…
Correções:
1. "à cerca de" → "acerca de": locução prepositiva = sobre.
…
[Opcional] Versão mais profissional: …
```

## Critérios de qualidade
- O sentido e a voz não mudam.
- Cada correção tem uma regra.
- Não há correções inventadas (se o original estava certo, não se mexe).
- Correção e reescrita estão separadas.

## Dependências
`lingua/erros-frequentes.md`, `lingua/glossario.md`. WebSearch para dúvidas de norma.
