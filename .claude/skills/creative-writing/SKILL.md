---
name: creative-writing
description: Escreve prosa literária (cena, capítulo, conto, poema, guião) respeitando PROJECT.md, style guide, canon e scene sheet. Usar em modo DRAFT, depois de a cena estar desenhada.
argument-hint: "[sc-id]"
---
# creative-writing

## Propósito
Produzir texto com a voz do projeto que executa a scene sheet, sem introduzir canon novo às escondidas.

## Quando usar
- Modo DRAFT, com a cena desenhada (objetivo, conflito e viragem definidos).
- Reescrita integral pedida pelo autor depois de uma crítica.

## Quando NÃO usar
- A cena ainda não tem sheet: usa primeiro `scene-design`.
- Correções pontuais: usa `editing` ou `line-editing`.
- Modo CRITIQUE: não se escreve prosa.

## Inputs
**Protocolo de escrita do CLAUDE.md:** o output de `cwos context <sc-id>` e mais nada, salvo necessidade justificada.

## Processo
1. Lê a scene sheet. Se faltar o objetivo, o conflito ou a viragem, para e usa `scene-design`.
2. Confirma a cronologia e o KNOWLEDGE de cada personagem presente: ninguém sabe o que ainda não descobriu.
3. Relê o final da cena anterior para garantir a continuidade física (lugar, hora, objetos, ferimentos) e emocional.
4. Escreve sob a secção `## Texto` do ficheiro da cena, seguindo:
   - `PROJECT.md`: pessoa, tempo verbal, limites de conteúdo;
   - `project/style-guide.md`: cadência, densidade, diálogo com travessão;
   - informação do mundo em ação e não em blocos expositivos (ver `show-dont-tell`);
   - diálogo com subtexto (ver `dialogue`).
5. **Invenções necessárias** (um nome de rua, um figurante, um detalhe de objeto) são permitidas, mas listadas no fim como PROPOSTA. Não crias ficha sem pedido.
6. Não uses clichés da lista sem intenção. Corre `cwos cliches <ficheiro>` no fim.
7. Mantém `stage: rascunho`.
8. Corre `cwos wc <ficheiro>` e `cwos mentions <ficheiro>`: nomes não indexados podem ser invenções a declarar.

## Output
- Texto na cena.
- **Notas para o autor:** invenções (PROPOSTA), desvios à sheet e porquê, dúvidas, gates G5, G6 e G8 autoavaliados.

## Critérios de qualidade
- A viragem da sheet acontece em cena, visível.
- A voz é consistente com o style guide.
- Não há contradições com o canon.
- Não há factos inventados apresentados como reais.
- Cada parágrafo faz avançar pelo menos um destes: ação, personagem, tensão ou atmosfera funcional.

## Exemplo de nota final
`Invenções (PROPOSTA): "Rua do Corvo" como morada da farmácia; figurante "D. Amélia". Desvio: a viragem acontece antes do diálogo, para manter a cena curta.`

## Dependências
`cwos context`, `cwos cliches`, `cwos mentions`, `cwos wc`. Skills de apoio: `dialogue`, `show-dont-tell`, `voice`. A seguir: CRITIQUE.
