---
name: scene-design
description: Projeta cenas — objetivo, conflito, stakes, obstáculo, subtexto, viragem, mudança emocional, entrada e saída — e preenche a scene sheet. Usar antes de escrever uma cena ou quando uma cena existente não muda nada. Modo ARCHITECT.
argument-hint: "[sc-id]"
---
# scene-design

## Propósito
Garantir que cada cena é uma unidade de mudança (G5) antes de ser escrita.

## Quando usar
- A cena existe no outline e ainda não tem sheet completa.
- A crítica disse "esta cena não faz nada" ou "está parada".

## Quando NÃO usar
- A cena já tem sheet e o problema é de prosa: usa `editing` ou `line-editing`.
- Falta a estrutura global: usa `story-architecture`.

## Inputs
Corre `cwos context <sc-id>` e lê só o que o comando lista. Acrescenta a linha da cena em `story/outline.md`.

## Processo
1. Se a cena não existir: `cwos add scene sc-NN "Título"`.
2. Preenche o frontmatter: `pov`, `characters`, `location`, `prev`, `events` e `facts`, todos por id. Assim o `cwos context` e o `cwos validate` funcionam.
3. Preenche a sheet:
   - **Objetivo:** o que o POV quer *nesta cena*. Deve ser concreto e verificável.
   - **Conflito / obstáculo:** quem ou o quê se opõe, e como.
   - **Stakes:** o que se perde se falhar *agora*.
   - **Subtexto:** o que ninguém diz.
   - **Viragem (TURN):** o momento exato em que o valor muda.
   - **Mudança emocional:** de ___ para ___. Se for igual nos dois lados, a cena não funciona.
   - **Informação revelada:** o que o leitor e cada personagem passam a saber (atualiza KNOWLEDGE depois de aprovado).
   - **Entrada / saída:** entrar o mais tarde e sair o mais cedo possível.
4. **Teste de eliminação:** se a cena fosse cortada, o que se perdia? Se a resposta for "nada", propõe fundi-la ou cortá-la, **sem o fazer**.
5. Verifica a continuidade com a cena anterior: hora, lugar, estado físico e conhecimento das personagens.

## Output
Scene sheet preenchida, `stage: rascunho` e texto ainda vazio. Resumo numa linha: objetivo → viragem → mudança.

## Critérios de qualidade
- O objetivo é concreto.
- Há uma viragem identificável numa frase.
- A mudança de valor não é nula.
- As referências por id são válidas (`cwos validate`).

## Exemplo
**OBJECTIVE:** Inês quer fechar o inventário antes de o sobrinho chegar. **TURN:** encontra a sua própria letra infantil no livro. **EMOTIONAL CHANGE:** alívio → vergonha.

## Dependências
`escrita/templates/scene.md`, `cwos add`, `cwos context`. Agent: `scene-editor`. A seguir: `creative-writing`.
