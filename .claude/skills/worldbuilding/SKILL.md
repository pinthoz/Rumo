---
name: worldbuilding
description: Constrói locais, culturas, instituições, tecnologia, história e regras do mundo com função narrativa, evitando worldbuilding ornamental. Usar ao criar ou verificar elementos de cenário, incluindo cenários realistas. Modo ARCHITECT.
argument-hint: "[elemento ou regra]"
---
# worldbuilding

## Propósito
Criar um mundo que pressiona as personagens e gera conflito, em que cada elemento serve a história.

## Quando usar
- Um local, instituição ou regra necessários ao outline ainda não existem.
- Há um problema de coerência do mundo ("porque é que não usam X para resolver isto?").

## Quando NÃO usar
- Para criar lore "porque sim": se nenhuma cena o usa, não se cria.
- Para detalhes factuais do mundo real: usa `research` ou `fact-check`, e depois liga o resultado aqui.

## Inputs
`story/outline.md` (para saber o que é necessário), `world/rules.md` (se existir), e as entradas existentes indicadas pelo `editorial/canon-index.md`.

## Processo
1. Para cada elemento, responde primeiro: **que cena precisa disto e para quê?** Sem resposta, para.
2. Cria a entrada com `cwos add <location|culture|institution|technology|history|object> <id> "Nome"`.
3. Descrição concreta e sensorial, limitada ao que o texto vai usar.
4. **Regras:** cada regra tem enunciado, custo ou limite e consequência narrativa (`world/rules.md`). Uma regra sem custo é um deus ex machina em potência.
5. **Teste do "porque não?":** para cada problema central da história, verifica se alguma regra ou tecnologia o resolveria trivialmente. Se sim, assinala-o como P0/P1.
6. Liga os elementos por ids (`depends_on`), incluindo os `fact-` de research quando o elemento se baseia no mundo real.
7. Corre `cwos validate`.

## Output
Entradas em `world/` (PROPOSTA). Resumo com a função narrativa de cada entrada e os riscos de coerência.

## Critérios de qualidade
- Cada entrada tem uma função narrativa escrita.
- As regras têm custo.
- Não há contradições com regras existentes.
- A informação do mundo é revelada em cena, não num bloco de exposição: esta nota fica para `creative-writing`.

## Exemplo
**Regra:** "Os livros de registo de psicotrópicos são auditados de 5 em 5 anos." **Custo:** a falsificação só se aguenta entre auditorias. **Consequência:** dá prazo à protagonista.

## Dependências
`escrita/templates/world-entry.md`, `escrita/templates/world-rules.md`. Agent: `worldbuilding-editor`. Para factos: `research`.
