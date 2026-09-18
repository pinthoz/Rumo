---
name: creative-brief
description: Transforma uma ideia inicial num creative brief estruturado (pergunta dramática, temas, direção, âmbito, questões em aberto). Usar no início de um projeto ou quando a direção criativa está difusa. Modo DISCOVER.
argument-hint: "[ideia]"
---
# creative-brief

## Propósito
Converter uma ideia vaga num `project/brief.md` que oriente todas as decisões seguintes, sem fechar prematuramente escolhas que pertencem ao autor.

## Quando usar
- Ideia nova ("quero escrever sobre…").
- Projeto existente sem direção clara, ou com decisões contraditórias.

## Quando NÃO usar
- Já existe um brief aprovado e a questão é estrutural: usa `story-architecture`.
- O autor quer texto imediatamente e o brief já existe: usa `creative-writing`.

## Inputs
- Ideia do autor (argumento), `PROJECT.md` (já em contexto), `project/brief.md` se já existir.

## Processo
1. Se não houver projeto ativo, sugere `node scripts/cwos.mjs new <slug> --profile …` (short para conto/poema, long para romance/novela, universe para universos partilhados) e espera confirmação.
2. Reformula a ideia numa frase e confirma que é isso.
3. Faz **no máximo 5 perguntas** de alto impacto: formato e extensão, público, emoção dominante, o que a obra não é, e restrições. Se o autor preferir avançar, regista as respostas em falta como "Questões em aberto".
4. Extrai:
   - a pergunta dramática;
   - 2–4 temas formulados como perguntas;
   - a direção criativa: referências reduzidas a características abstratas;
   - os riscos previsíveis: clichés do género, armadilhas de tom.
5. Apresenta **2–3 ângulos** para a ideia (A conservador, B alternativo, C radical) quando o núcleo ainda estiver em aberto.
6. Escreve `project/brief.md` a partir de `escrita/templates/brief.md`, com `status: PROPOSTA`.
7. Propõe os valores de identidade para `PROJECT.md` (género, formato, tom…). Só os escreve depois de o autor os confirmar.

## Output
- `project/brief.md` (PROPOSTA).
- Resumo no chat: o núcleo em 3 linhas, os ângulos e as questões em aberto.

## Critérios de qualidade
- A pergunta dramática é respondível pelo final da história.
- Os temas são perguntas e não mensagens moralizantes.
- "O que a obra NÃO é" existe e é específico.
- Nenhuma decisão do autor foi tomada em nome do utilizador.

## Exemplo
Ideia: *"uma farmacêutica que descobre algo no livro de registos do pai morto"*. A pergunta dramática possível seria: *"Ela vai proteger a memória do pai ou a verdade?"* Um tema possível: *"O que devemos aos mortos quando os vivos ainda sofrem as consequências?"*

## Dependências
`escrita/templates/brief.md`, `scripts/cwos.mjs new`. A seguir: `story-architecture`.
