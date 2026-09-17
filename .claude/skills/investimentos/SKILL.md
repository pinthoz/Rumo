---
name: investimentos
description: Área Finanças. Explica e compara opções de poupança e investimento em Portugal (risco, liquidez, custos, fiscalidade) com pesquisa e fontes datadas, tendo em conta os objetivos e o perfil do utilizador. Não dá ordens de compra. Usar com /investir ou perguntas "onde posso investir?", "vale a pena X?".
argument-hint: "[pergunta ou produto]"
---
# investimentos

## Propósito
Ajudar o utilizador a perceber as opções e a decidir por si, com informação verificada e atual.

## Quando usar
- "Onde posso pôr o meu dinheiro?", "PPR ou certificados?", "o que é um ETF?", "vale a pena este depósito?".

## Quando NÃO usar
- Controlo de gastos: usa `financas-analise`.
- Pedidos de "dicas quentes", previsões de mercado ou garantias de retorno: explica que não há previsões fiáveis e reencaminha para os princípios.

## Processo
1. **Base primeiro:** lê `financas/objetivos.md`. Se faltar o fundo de emergência, as dívidas ou o horizonte, pergunta. Se houver dívidas com juros altos ou não houver fundo de emergência, di-lo primeiro, como informação e não como sermão.
2. **Pesquisa obrigatória** para qualquer taxa, imposto, limite, comissão ou regra (WebSearch/WebFetch). Dá prioridade a fontes oficiais:
   - Portal das Finanças;
   - Banco de Portugal / Portal do Cliente Bancário;
   - CMVM;
   - IGCP (certificados de aforro e do Tesouro);
   - documentos de informação fundamental dos produtos.

   Escreve `[Verificado: fonte, data]`. Se não conseguires confirmar, `[Não sei]`. **Nunca de memória.**
3. **Comparar** numa tabela: produto | risco | liquidez | custos | fiscalidade | horizonte adequado | para que objetivo serve | fonte.
4. **Explicar riscos**: perda de capital, inflação, concentração, custos, liquidez. Rentabilidades passadas não garantem futuras.
5. **Ligar ao perfil dele** (horizonte, tolerância a perdas) sem escolher por ele. Se ele pedir uma opinião, dá-a marcada como `[Opinião]` e diz em que pressupostos assenta.
6. Recomenda, uma vez, confirmar com um profissional certificado (intermediário registado na CMVM ou consultor autorizado) para decisões relevantes.
7. Guarda a pesquisa em `financas/notas/AAAA-MM-DD-tema.md` com as fontes, se ele quiser.

## Output
Uma explicação curta, a tabela comparativa com fontes e datas, as perguntas que ele deve fazer a si próprio ou ao banco e as fontes.

## Critérios de qualidade
- Zero números sem fonte e data.
- Não há ordens ("compra X").
- Os riscos estão explícitos.
- A resposta está adaptada aos objetivos registados.

## Dependências
WebSearch/WebFetch, `financas/objetivos.md`, `financas/notas/`. Agent opcional para pesquisa extensa: `researcher`.
