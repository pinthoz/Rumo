---
name: dialogue
description: Escreve e revê diálogos avaliando voz individual, subtexto, intenção, ritmo, naturalidade, informação implícita e exposição artificial. Usar ao escrever cenas com fala ou quando um diálogo soa falso ou expositivo.
argument-hint: "[ficheiro ou sc-id]"
---
# dialogue

## Propósito
Diálogo em que cada fala é uma ação: alguém quer alguma coisa de outra pessoa.

## Quando usar
- Cenas com fala (em DRAFT).
- Críticas do tipo "exposição em diálogo", "todos falam igual" ou "demasiado explícito".

## Quando NÃO usar
- O problema é o objetivo da cena: usa `scene-design`.
- Pontuação isolada: usa `line-editing`.

## Inputs
O trecho de diálogo, a secção VOICE das fichas das personagens que falam e a scene sheet (objetivo e subtexto).

## Processo
1. Para cada fala, identifica a **intenção**: o que a personagem quer obter com ela.
2. **Teste de voz:** tapa as etiquetas. Consegues saber quem fala? Se não, ajusta o léxico, o ritmo e o que cada uma evita dizer, conforme a ficha.
3. **Teste de exposição:** a personagem diria isto a *esta* pessoa, que já sabe o que sabe? Se não, estás perante um "As you know, Bob". Opções: conflito, desconhecimento real ou mover a informação para ação ou pensamento.
4. **Subtexto:** onde é que a personagem diz A e quer B? Se o diálogo for 100% literal, procura um ponto onde se pode desviar, calar ou responder a outra coisa.
5. **Ritmo:** alterna réplicas curtas e longas. Corta cumprimentos e preâmbulos (entrar tarde).
6. **Etiquetas:** "disse" é invisível. Evita advérbios nas etiquetas e usa ação no lugar da etiqueta quando essa ação for informativa.
7. **Formatação pt-PT:** travessão (—) em parágrafo próprio; a interrupção do narrador também leva travessão.
8. Em modo CRITIQUE, lista os problemas com o formato do CLAUDE.md. Em EDIT ou DRAFT, reescreve e explica as mudanças principais.

## Output
Crítica (P2 na maioria dos casos) ou diálogo revisto, com notas.

## Critérios de qualidade
- Cada fala tem intenção.
- As vozes distinguem-se sem etiquetas.
- Não há exposição artificial.
- Existe pelo menos um momento de subtexto por cena de diálogo.

## Exemplo
Antes: "— Como sabes, o pai morreu há um mês e deixou a farmácia." Depois: "— Um mês, e ainda ninguém tirou o nome dele da montra."

## Dependências
Fichas (VOICE). Agent: `dialogue-editor`.
