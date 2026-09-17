---
name: pacing
description: Analisa e corrige o ritmo — macro (distribuição de cenas e beats), meso (dentro da cena) e micro (frase e parágrafo) — usando métricas do cwos style. Usar quando o texto "arrasta" ou "corre demasiado".
argument-hint: "[ficheiro(s) ou âmbito]"
---
# pacing

## Propósito
Adequar a velocidade de leitura à função dramática de cada momento.

## Quando usar
- A crítica aponta lentidão ou pressa.
- Antes de POLISH num capítulo ou num conto inteiro.

## Quando NÃO usar
- A cena não tem viragem: não é um problema de ritmo, é de design (`scene-design`).

## Inputs
Texto e `cwos style <ficheiros>`. Para o nível macro: `story/outline.md` e `cwos wc`.

## Processo
1. **Macro:** com o `cwos wc` por cena e o outline, compara o espaço ocupado com a importância dramática. O clímax tem espaço suficiente? O setup é longo demais?
2. **Meso:** em cada cena, localiza a viragem e mede quanto texto vem antes e depois. A tensão sobe até à viragem? Há desvios que a travam?
3. **Micro:** usa as métricas.
   - Média e desvio de frase: um desvio baixo significa monotonia.
   - Percentagem de frases curtas ou longas: ação pede frases curtas, reflexão tolera longas.
   - Percentagem de diálogo e tamanho médio de parágrafo.
4. Compara com o perfil em `project/style-guide.md`. O ritmo "certo" é o do projeto, não um valor universal.
5. Diagnostica pelo formato de crítica do CLAUDE.md, com severidade P1 (macro) ou P2/P3 (micro).
6. Em modo EDIT: aplica as correções de meso e micro. As correções macro (cortar ou mover cenas) **ficam como propostas**.

## Output
Um mapa de ritmo (tabela cena → palavras → função → avaliação) com o diagnóstico e as opções.

## Critérios de qualidade
- Diagnóstico baseado em evidência, com métrica ou citação.
- Distinção entre lentidão intencional (tensão, contemplação) e acidental.

## Exemplo
`sc-02: 1 900 palavras, 62% em reflexão antes da viragem (linha 48). Desvio de frase 4,1: monótono. Opções: A) cortar a memória do liceu; B) intercalá-la com a ação do inventário.`

## Dependências
`cwos style`, `cwos wc`. Agents: `scene-editor`, `literary-editor`.
