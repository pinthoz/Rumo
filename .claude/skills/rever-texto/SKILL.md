---
name: rever-texto
description: Área Escrita. Revê um texto criativo solto (conto, crónica, poema, excerto) sem criar projeto — coerência interna, tom face à voz do utilizador (escrita/voz.md), clichés — e ajuda a desbloquear com perguntas, sem reescrever. Usar com /rever ou "vê se esta história está coerente", "isto soa a mim?", "estou bloqueado".
argument-hint: "[ficheiro ou texto] [coerência|tom|desbloquear]"
---
# rever-texto

## Propósito
Ajudar o utilizador a escrever **como o utilizador escreve**. Assinala incoerências e desvios de tom e faz perguntas que desbloqueiam, mas não escreve pelo utilizador.

## Quando usar
- Um texto isolado, ou uma ideia, sem a estrutura de projeto de `escrita/projetos/`.
- "Isto está coerente?", "isto soa a mim?", "não sei como continuar".

## Quando NÃO usar
- Obras longas com personagens e cronologia a manter: cria um projeto (`/project new …`) e usa `/critique` e `/continuity`.
- Correção ortográfica ou gramatical: usa `corretor-pt`.

## Inputs
O texto (ficheiro ou colado), `escrita/voz.md` e, se o texto for de um projeto, o `project/style-guide.md` desse projeto em vez de `voz.md`.

## Processo
1. **Primeira vez** (se `escrita/voz.md` estiver por preencher):
   1. Pede 3 a 5 textos do utilizador que o utilizador considere representativos.
   2. Corre `node scripts/cwos.mjs style <ficheiros>` e lê-os.
   3. Preenche `voz.md` com características **e exemplos dos textos do utilizador**, sem comparações com autores.
   4. Mostra ao utilizador o perfil e regista em "Confirmado pelo utilizador" só o que o utilizador reconhecer como seu.
2. **Pergunta o foco** se não vier no pedido: coerência, tom ou desbloquear. Faz só o que foi pedido.
3. **Coerência** (lógica interna):
   - quem sabe o quê e quando;
   - tempo e lugar (datas, horas, deslocações);
   - causa e efeito;
   - personagens que agem contra o que o texto estabeleceu;
   - objetos que aparecem ou desaparecem;
   - regras do mundo, se as houver.

   Cada problema leva a citação ou a localização e a severidade (P0 contradição · P1 causalidade · P2 menor).
4. **Tom:**
   1. `node scripts/cwos.mjs style <ficheiro>` e `node scripts/cwos.mjs cliches <ficheiro>`.
   2. Compara com `voz.md`: onde o texto se afasta da voz do utilizador, com citação.
   3. Distingue um desvio **intencional** de uma **deriva**, perguntando.
   4. Com menos de 3 textos no perfil, os comentários de tom são `[Incerto]`.
5. **Desbloquear:**
   1. No máximo 3 perguntas abertas: o que quer a personagem agora, o que é o pior que pode acontecer, o que é que ninguém diz.
   2. Se o utilizador pedir, 2 ou 3 **direções** possíveis (A conservadora, B alternativa, C radical), descritas numa linha cada e não escritas em prosa.
6. **Não reescrever.** Só se o utilizador pedir explicitamente, e nesse caso uma frase ou um parágrafo de exemplo, marcado como `[Sugestão]` e dentro da voz do utilizador.

## Output
Uma lista curta por foco (no máximo 7 pontos): o que funciona (1–2 pontos), os problemas com localização e as perguntas ou direções.

## Critérios de qualidade
- Nada é inventado sobre a voz do utilizador sem textos que o mostrem.
- Cada problema tem evidência.
- Não há reescrita não pedida.
- Um foco de cada vez.

## Dependências
`escrita/voz.md`, `scripts/cwos.mjs` (`style`, `cliches` funcionam com ficheiros soltos). Para obras longas: `creative-brief`, `continuity-check` e os agents da área Escrita.
