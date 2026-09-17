---
name: story-architecture
description: Constrói a arquitetura narrativa — premissa, conflito, stakes, estrutura, atos, beats, turning points, clímax, resolução e outline de cenas. Usar depois do brief ou quando a história "não anda" por razões estruturais. Modo ARCHITECT.
argument-hint: "[premissa | outline | estrutura]"
---
# story-architecture

## Propósito
Garantir que a história tem um motor causal, com um desejo, um obstáculo, uma escalada e uma mudança, antes de se investir em prosa.

## Quando usar
- Há um brief e ainda não há premissa, estrutura ou outline.
- Diagnóstico P1 estrutural (causalidade, ritmo macro, clímax fraco).
- Pedido `/architect` ou `/outline`.

## Quando NÃO usar
- Problemas de frase ou de cena isolada: usa `editing`, `scene-design` ou `line-editing`.
- Ainda não existe direção (sem brief): usa primeiro `creative-brief`.

## Inputs
`project/brief.md`, `story/premise.md`, `story/structure.md` (perfil long) e `story/outline.md`. Das personagens, só as fichas de quem conduz o conflito.

## Processo
1. **Premissa** (`story/premise.md`): logline, conflito externo, interno e relacional, stakes e sinopse com final. Se o final não estiver decidido, apresenta 2–3 finais possíveis e **não escolhas**.
2. **Teste causal:** encadeia os acontecimentos com "portanto" e "mas", nunca com "e depois". Cada "e depois" é um ponto a corrigir.
3. **Estrutura:** escolhe o modelo adequado ao formato (3 atos, 4 partes, kishōtenketsu, episódica…) e justifica a escolha. Um conto pode ter um único movimento. Não forces beats de romance num conto.
4. Para cada beat, identifica a mudança de valor (por exemplo, confiança → suspeita).
5. **Arcos:** estado inicial, pressão e estado final de cada personagem principal (em `story/structure.md` ou numa secção da premissa, no perfil short).
6. **Outline** (`story/outline.md`): uma linha por cena, com objetivo e viragem. Cria as cenas com `cwos add scene sc-NN "Título"` e marca-as como PROPOSTA no outline.
7. Regista os acontecimentos-chave em `story/timeline.md` (ids `ev-`, status PROPOSTA).
8. Corre `cwos validate`.

## Output
Ficheiros acima (PROPOSTA) e um resumo com: a estrutura numa tabela, os pontos fracos detetados e as decisões pendentes do autor.

## Critérios de qualidade
- Cada turning point é causado por uma escolha ou por uma consequência, nunca por coincidência.
- O clímax resolve a pergunta dramática do brief.
- As stakes escalam.
- Cada cena do outline muda um valor (G5).
- Não há subplots sem ligação ao tema ou ao conflito.

## Exemplo
`| 3 | sc-03 | char-ines | quer confirmar a letra do pai → descobre que a letra é dela própria, de criança | PROPOSTA |`

## Dependências
`escrita/templates/premise.md`, `escrita/templates/structure.md`, `escrita/templates/outline.md`, `escrita/templates/timeline.md`. Agent opcional: `story-architect`. A seguir: `character-development` e `scene-design`.
