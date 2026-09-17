---
name: line-editing
description: Edição de linha — clareza, ritmo, redundância, cadência, precisão lexical, sintaxe e impacto — preservando a voz. Usar em modo POLISH sobre texto estruturalmente aprovado.
argument-hint: "[ficheiro ou trecho]"
---
# line-editing

## Propósito
Limpar a prosa (G8) sem mudar o que ela faz nem a quem pertence.

## Quando usar
- Modo POLISH, com a cena em `stage: revisto` ou com aprovação explícita.

## Quando NÃO usar
- Há P0 ou P1 abertos na cena: resolve-os primeiro com `editing`.
- Rascunho inicial que ainda pode ser cortado.

## Inputs
O texto, `project/style-guide.md`, `cwos style <ficheiro>` e `cwos cliches <ficheiro>`.

## Processo
1. Corre `cwos style` e `cwos cliches`. As palavras repetidas, os advérbios em -mente e os clichés são pistas, não ordens.
2. Frase a frase:
   - **Clareza:** o sujeito e a ação percebem-se à primeira leitura?
   - **Redundância:** pleonasmos, adjetivos que repetem o nome, "começou a" e "de repente" desnecessários.
   - **Precisão lexical:** o verbo exato em vez de verbo com advérbio; o substantivo concreto em vez do genérico.
   - **Cadência:** lê em voz alta (mentalmente). Varia o comprimento conforme o style guide.
   - **Impacto:** a palavra mais forte fica no fim da frase ou do parágrafo.
   - **Sintaxe e pontuação pt-PT:** vírgula entre sujeito e verbo, colocação pronominal (ênclise por omissão em pt-PT), travessões.
3. **Não mexer:** marcas de voz documentadas, repetições deliberadas, oralidade das personagens, clichés da lista de permitidos.
4. Apresenta as alterações de forma rastreável. Para trechos curtos, antes/depois. Para cenas inteiras, edita o ficheiro e lista as alterações relevantes, agrupadas por tipo.

## Output
Texto polido e uma lista de alterações por tipo, com as dúvidas em que o autor deve decidir (P3).

## Critérios de qualidade
- As métricas continuam dentro do perfil do style guide.
- Não há mudanças de sentido.
- A voz não se nota "normalizada".

## Exemplo
"Ela começou a andar lentamente em direção à porta" → "Arrastou-se até à porta."

## Dependências
`cwos style`, `cwos cliches`, style guide. Agent: `line-editor`.
