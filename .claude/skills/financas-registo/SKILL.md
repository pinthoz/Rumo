---
name: financas-registo
description: Área Finanças. Importa extratos bancários (CSV), regista gastos avulsos, categoriza movimentos e mantém regras de categorização, orçamento e saldos das contas. Usar com /gastos ou quando o utilizador tem um extrato novo ou quer registar uma despesa.
argument-hint: "[caminho do extrato | despesa a registar]"
---
# financas-registo

## Propósito
Ter os movimentos completos e categorizados, com o mínimo de trabalho manual.

## Quando usar
- Chegou um extrato novo (CSV exportado do homebanking).
- Registar uma despesa em dinheiro ou fora do banco.
- Existem movimentos sem categoria.
- Atualizar os saldos das contas.

## Quando NÃO usar
- Analisar ou tirar conclusões: usa `financas-analise`.
- Perguntas sobre investimentos: usa `investimentos`.

## Processo
1. **Extrato:**
   1. `node scripts/financas.mjs importar <ficheiro> --conta <nome>`.
   2. Se falhar por causa das colunas, abre só as primeiras 15 linhas do ficheiro, identifica os nomes das colunas e repete com `--colunas "data=…,descricao=…,valor=…"`.
   3. Explica ao utilizador como exportar o extrato em CSV no banco, só se o utilizador não souber. Não inventes menus do homebanking: se não sabes, di-lo.
2. **Despesa avulsa:** acrescenta uma linha ao ficheiro do mês `financas/movimentos/AAAA-MM.csv` (valor negativo, conta `dinheiro`), mantendo o formato. Confirma a data e o valor antes.
3. **Categorizar:**
   1. `node scripts/financas.mjs categorizar`.
   2. Para as descrições que faltam, propõe uma regra (`padrao;categoria`) para cada uma. O padrão deve ser curto e específico (não usar "bp", que apanha "BPI").
   3. Com o acordo do utilizador, acrescenta as regras a `financas/regras.csv` e volta a correr.
   4. Movimentos entre contas próprias → `Transferências`.
4. **Orçamento:** se `financas/orcamento.csv` tiver limites vazios, pergunta os valores (não sugiras números sem base; podes mostrar a média real dos últimos meses com `resumo`).
5. **Saldos:** se `financas/contas.csv` não existir, copia-o de `contas.modelo.csv`. Atualiza-o com os valores que o utilizador der, com a data.
6. No fim, corre `node scripts/financas.mjs resumo` e mostra só as linhas principais.

## Output
O que foi importado ou categorizado (números do script) e o que falta.

## Critérios de qualidade
- Nenhum valor é escrito sem vir do extrato ou do utilizador.
- Não há movimentos duplicados (o script garante-o).
- As regras novas são confirmadas antes de serem gravadas.

## Dependências
`scripts/financas.mjs`, ficheiros em `financas/`.
