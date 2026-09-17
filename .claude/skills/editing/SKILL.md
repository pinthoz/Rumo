---
name: editing
description: Revisão editorial por níveis (macroestrutura → cena → personagem → parágrafo → frase → palavra), de cima para baixo, com severidade P0–P3. Usar em modo EDIT para reescrever com base num diagnóstico, ou para produzir um diagnóstico completo antes de reescrever.
argument-hint: "[ficheiro(s)] [nível]"
---
# editing

## Propósito
Melhorar o texto pela ordem certa: primeiro o que pode eliminar partes inteiras, só depois o polimento.

## Quando usar
- Depois de uma crítica, para aplicar correções.
- "Revê este capítulo" (neste caso, diagnostica primeiro e só depois reescreve).

## Quando NÃO usar
- Só falta polimento de frase num texto estruturalmente aprovado: usa `line-editing`.
- Modo CRITIQUE: usa os agents de crítica, que não reescrevem.

## Inputs
O texto, o relatório de crítica em `editorial/reports/` (se existir) e o `cwos context <sc-id>`.

## Processo
1. **Sem diagnóstico, não há edição.** Se não existir relatório, produz primeiro uma lista classificada P0–P3 e confirma o âmbito com o autor quando houver P0 ou P1.
2. Trabalha os níveis por ordem, parando onde a decisão já não te cabe:
   1. **Macroestrutura:** ordem das cenas, cortes, fusões. *Só propostas*; implementar exige aprovação.
   2. **Cena:** objetivo, viragem e entrada/saída (`scene-design`).
   3. **Personagem:** coerência com a ficha e com KNOWLEDGE (`character-development`).
   4. **Parágrafo:** função, ordem, transições, exposição (`show-dont-tell`).
   5. **Frase e palavra:** passa a `line-editing`.
3. Resolve P0 e P1 antes de P2 e P3. Não polires o que pode desaparecer.
4. Guarda a versão anterior: o git é o versionamento. Recomenda um commit antes de uma reescrita grande. Para rascunhos que o autor queira manter lado a lado, usa `manuscript/drafts/` (perfil long).
5. Mantém a voz (style guide). Uma edição não é uma reescrita na voz da IA.
6. Depois de editar, sobe `stage` para `revisto` apenas quando os P0 e P1 da cena estiverem resolvidos.

## Output
Texto editado e um **registo de alterações**: o que mudou, porquê e que problema resolve (com o id do relatório). Inclui também o que ficou por decidir.

## Critérios de qualidade
- Cada alteração liga-se a um problema diagnosticado.
- Não há mudanças estruturais não autorizadas.
- A voz é preservada.
- Os gates relevantes são verificados no fim.

## Dependências
`line-editing`, `scene-design`, `show-dont-tell`, `dialogue`. Agents: `literary-editor` (diagnóstico) e `quality-controller` (verificação).
