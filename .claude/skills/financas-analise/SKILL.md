---
name: financas-analise
description: Área Finanças. Analisa o mês (receitas, despesas, poupança, orçamento, tendências) e o património a partir dos scripts, e ajuda a definir objetivos e fundo de emergência. Usar com /financas, "quanto gastei?", "quanto dinheiro tenho?", "onde posso cortar?".
argument-hint: "[AAAA-MM | pergunta]"
---
# financas-analise

## Propósito
Responder com números exatos a "como estou?" e transformar os números em 1–3 decisões possíveis.

## Quando usar
- Fecho do mês, ou pergunta sobre gastos, orçamento ou património.
- Primeira vez: definir objetivos (`financas/objetivos.md`).

## Quando NÃO usar
- Há movimentos por importar ou categorizar: primeiro `financas-registo`.
- Escolher produtos de investimento: usa `investimentos`.

## Processo
1. **Primeira vez:** se `financas/objetivos.md` não existir, copia-o de `objetivos.modelo.md` e preenche-o **com perguntas**, uma secção de cada vez. Não o preenchas com suposições.
2. Corre o comando que responde à pergunta. Se houver movimentos sem categoria, diz quanto pesam antes de concluir.
   - `node scripts/financas.mjs resumo [mês]`: o mês, o orçamento e **quanto ainda pode gastar** (por dia, se for o mês corrente).
   - `patrimonio`: "quanto dinheiro tenho?".
   - `recorrentes`: despesas fixas e subscrições. Confirma cada linha com ele, porque a deteção é por descrição.
3. **Leitura dos números** (só com o que o script deu):
   - saldo e taxa de poupança do mês;
   - categorias acima do limite (❌) ou perto dele (⚠);
   - categorias muito acima da média dos meses anteriores;
   - as maiores despesas;
   - o peso das despesas recorrentes (subscrições esquecidas são o corte mais fácil).
   - Contas a pagar com data certa (renda, seguros) podem virar tarefas recorrentes na área Rotina (`*mensal`), mas só se ele pedir.
4. **Opções** (no máximo 3), cada uma com o impacto em euros calculado a partir dos dados. Por exemplo: "Restauração está 120 € acima da média; voltar à média liberta cerca de 120 €/mês". Marca como `[Sugestão]`. Ele decide.
5. **Objetivos:** compara com `objetivos.md` (fundo de emergência, metas).
6. Regista as decisões que ele tomar em `objetivos.md` → "Decisões tomadas".

## Output
```
Setembro 2026: receitas X · despesas Y · saldo Z (poupança N%)
Acima do orçamento: …
A reparar: …
Opções: 1) … 2) …
```

## Critérios de qualidade
- Todos os números vêm do script.
- Não há juízos morais.
- As opções são quantificadas.
- Assinalam-se os dados incompletos (meses em falta, sem categoria).

## Dependências
`scripts/financas.mjs`, `financas/objetivos.md`. Relacionadas: `financas-registo`, `investimentos`.
