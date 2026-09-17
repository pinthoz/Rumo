---
name: fact-check
description: Verifica afirmações factuais já presentes no manuscrito ou na bible (datas, lugares, procedimentos, termos técnicos, anacronismos) e classifica-as VERIFIED/LIKELY/UNCERTAIN/FICTIONALIZED. Usar antes do QA final ou quando a história depende do mundo real.
argument-hint: "[ficheiro(s)]"
---
# fact-check

## Propósito
Garantir G9: nenhum erro factual essencial, e todos os desvios deliberados documentados.

## Quando usar
- Texto com referências a pessoas, lugares, datas, instituições, técnicas ou leis reais.
- Ficção histórica (anacronismos de objetos, linguagem e preços).

## Quando NÃO usar
- Fantasia pura sem âncoras reais: usa `continuity-check` com `world/rules.md`.

## Processo
1. **Extrair afirmações verificáveis** do âmbito: datas, topónimos, instituições, procedimentos, números, termos técnicos, objetos datáveis. Lista-as numa tabela.
2. Para cada uma, procura primeiro nas notas existentes (`research/notes`, via `editorial/canon-index.md`, secção fact). Se já estiver VERIFIED, cita a nota.
3. As restantes verificam-se com WebSearch/WebFetch (duas fontes quando o facto for essencial). Os factos novos relevantes ficam registados como `fact-*` (skill `research`).
4. Classifica: VERIFIED, LIKELY, UNCERTAIN, ERRADO (com a correção) ou FICTIONALIZED (só se o autor confirmar que o desvio é deliberado).
5. Severidade: um erro que quebra a verosimilhança ou a trama é P0; um erro menor detetável por leitores informados é P2. Um facto UNCERTAIN recebe a severidade que teria **se estivesse errado** e é assinalado como "por confirmar".
   - Os critérios de confiança (incluindo a regra da fonte primária oficial) e as etiquetas "não encontrado" e "não verificado (fonte ilegível/inacessível)" são os da skill `research`.
   - Um PDF digitalizado pode ser lido como imagem, desde que o texto seja legível.
   - Se o texto mudar durante a verificação, verifica a versão atual do ficheiro e indica as linhas atuais.
6. **Não corrijas o texto.** Propõe as correções.

## Output
Tabela `| afirmação | local | veredicto | fonte | severidade | correção proposta |` numa secção FACTUAL ISSUES do relatório (`editorial/reports/`).

## Critérios de qualidade
- Nenhum veredicto sem fonte.
- Distinção clara entre ERRADO e UNCERTAIN.
- Nenhuma licença poética classificada como erro sem perguntar.

## Dependências
`research`, WebSearch/WebFetch. Agent: `fact-checker`.
