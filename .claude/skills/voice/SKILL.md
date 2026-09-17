---
name: voice
description: Define, mede e preserva a voz autoral do projeto; constrói e atualiza o style-guide.md a partir do próprio texto; extrai características abstratas de referências sem imitar autores vivos. Usar ao criar o style guide ou quando o texto "não soa ao projeto".
argument-hint: "[ficheiro(s) de referência]"
---
# voice

## Propósito
Tornar a voz explícita e verificável (G6), para que qualquer colaborador, humano ou IA, escreva dentro dela.

## Quando usar
- Ainda não há style guide, ou há texto aprovado que ainda não foi medido.
- Uma cena "não soa ao resto".
- O autor fornece referências estilísticas.

## Quando NÃO usar
- Correções frase a frase: usa `line-editing`, que consulta o style guide.

## Inputs
O texto aprovado do autor (a melhor fonte), `cwos style <ficheiros>` e as referências fornecidas.

## Processo
1. **Medir:** corre `cwos style` sobre o texto aprovado ou sobre amostras do autor.
2. **Descrever**, sempre com exemplos do próprio texto:
   - comprimento e cadência das frases;
   - vocabulário (registo, campos lexicais, palavras evitadas);
   - densidade descritiva;
   - metáforas (frequência e domínios);
   - focalização e distância narrativa;
   - humor;
   - relação entre abstração e concretude;
   - forma do diálogo.
3. **Referências externas:** extrai apenas características abstratas (por exemplo, "frases longas com subordinação, pouca adjetivação, humor seco"). **Nunca** escrevas "à maneira de [autor vivo]" nem copies frases.
4. Escreve ou atualiza `project/style-guide.md` com `status: PROPOSTA`. O autor valida.
5. **Verificar texto novo:** compara as métricas de `cwos style <novo>` com o perfil e lê à procura de desvios qualitativos. Cada desvio é classificado: intencional (mudança de POV, clímax) ou deriva.

## Output
Style guide atualizado, ou um relatório de desvios com evidência.

## Critérios de qualidade
- Cada regra tem um exemplo do projeto.
- As métricas são reais (medidas) e não inventadas.
- Não há imitação de autores vivos.

## Dependências
`cwos style`, `escrita/templates/style-guide.md`. Agent: `literary-editor`.
