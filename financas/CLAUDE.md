# Área: Finanças

Serve para um **controlo financeiro rigoroso**: saber quanto dinheiro existe, para onde vai, se o orçamento está a ser cumprido e o que se pode considerar para poupar e investir.

## Ficheiros (os dados reais não vão para o git)
| ficheiro | conteúdo |
|---|---|
| `financas/movimentos/AAAA-MM.csv` | movimentos (`data;descricao;valor;categoria;conta`), com o valor negativo para despesas |
| `financas/regras.csv` | texto da descrição → categoria (categorização automática); criado a partir de `regras.modelo.csv` |
| `financas/orcamento.csv` | limite mensal por categoria; criado a partir de `orcamento.modelo.csv` |
| `financas/contas.csv` | saldos por conta (à ordem, poupança, investimento, dívida) com data (criado a partir de `contas.modelo.csv`) |
| `financas/objetivos.md` | objetivos, fundo de emergência, perfil de risco (criado a partir de `objetivos.modelo.md`, preenchido com ele) |
| `financas/notas/` | notas de pesquisa (investimentos, impostos), sempre com fonte e data |

**Contas fazem-se com `node scripts/financas.mjs`** (`importar`, `categorizar`, `resumo`, `recorrentes`, `patrimonio`). Nunca somes valores de cabeça: corre o script e cita o resultado.

## Regras desta área
1. **Números do utilizador só dos ficheiros.** Se um valor não está nos ficheiros, pergunta. Nunca estimes o salário, as despesas ou os saldos dele.
2. **Números do mundo só com fonte e data**: taxas, impostos, rentabilidades, comissões, limites legais. Pesquisa (WebSearch/WebFetch), dá preferência a fontes oficiais (Portal das Finanças, Banco de Portugal, CMVM, IGCP, Portal do Cliente Bancário) e escreve `[Verificado: fonte, data]`. Sem fonte, a resposta é `[Não sei]`.
3. **Investimentos: educar, comparar e mostrar riscos.** Não se dá uma ordem ("compra X"). Para cada opção indica-se o risco, a liquidez, os custos, a fiscalidade (com fonte) e para que tipo de objetivo serve. Antes de falar em investir, verifica em `objetivos.md` se há fundo de emergência e dívidas caras. Decisões relevantes: sugere confirmar com um profissional certificado (uma vez, sem sermão).
4. **Sem julgamentos** sobre gastos. Mostram-se os números e as opções.
5. Os movimentos entre contas próprias usam a categoria `Transferências` e não contam como receita nem despesa.
