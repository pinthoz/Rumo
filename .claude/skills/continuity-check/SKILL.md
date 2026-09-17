---
name: continuity-check
description: Deteta inconsistências entre manuscrito, story bible e timeline — idades, aparência, relações, localização, cronologia, conhecimento das personagens, objetos, ferimentos, regras do mundo — combinando verificações automáticas (cwos) e leitura dirigida. Usar após escrever/editar cenas ou alterar canon. Modo CONTINUITY.
argument-hint: "[ficheiro(s) | id | all]"
---
# continuity-check

## Propósito
Garantir G1 (canon) e G10 (continuidade futura) com evidência, e não por impressão.

## Quando usar
- Depois de DRAFT ou EDIT de uma cena.
- Depois de alterar uma entidade CANON (protocolo de alterações).
- Antes do QA final.

## Quando NÃO usar
- Para decidir qual das versões em conflito está certa: isso cabe ao autor.

## Inputs
O âmbito indicado. Nada mais é carregado sem o passo 1.

## Processo
1. **Automático primeiro:**
   - `cwos validate`: referências, estados, ordem da timeline;
   - `cwos mentions <ficheiros>`: nomes não indexados, grafias divergentes, entidades não-CANON usadas no texto;
   - `cwos deps <id>`: para cada entidade alterada; se nada mudou na bible, para a própria cena e para as entidades que ela usa;
   - `cwos canon-diff <ref>`: promoções sem registo. Por omissão, `<ref>` é o commit da última verificação ou entrega; `HEAD` só cobre alterações ainda por fazer commit.
2. **Leitura dirigida:** para cada entidade mencionada no âmbito, abre a ficha (só as secções relevantes) e verifica no texto:
   - identidade (nome, idade, aparência, marcas físicas);
   - relações (como se tratam, tu ou você, o que sabem uns dos outros);
   - localização e deslocações (é possível chegar de A a B no tempo dado?);
   - cronologia (dia, hora, estação, idade relativa a eventos da `story/timeline.md`);
   - **KNOWLEDGE** (ninguém sabe o que ainda não descobriu; ninguém esquece sem motivo);
   - objetos e ferimentos (onde ficou o objeto; um ferimento persiste);
   - regras do mundo (`world/rules.md`, se existir, e as secções "Regras e restrições" das entradas de mundo);
   - scene sheet contra texto, dentro do mesmo ficheiro (a sheet tem autoridade de PROVISIONAL).
   - Nas omissões (algo que devia estar e não está), indica o ficheiro e a secção em vez da linha.
3. **Futuro (G10):** se a alteração muda um facto, procura com `cwos deps` e Grep as cenas posteriores que dependem dele.
4. Classifica cada problema: P0 para contradição com CANON; P1 ou P2 para contradição entre entidades não canónicas ou para ambiguidades.
5. **Não corrijas.** Para cada conflito, indica as fontes em conflito, o nível de autoridade de cada uma (hierarquia do CLAUDE.md) e as opções.
6. Invenções do texto que ainda não estão na bible passam a candidatas a PROPOSTA.

## Output
Relatório `editorial/reports/AAAA-MM-DD-continuity-<âmbito>.md` (`cwos add report continuity-<âmbito>`) com a secção CONTINUITY e uma tabela:
`| sev | onde | afirma | contradiz | autoridade | opções |`

## Critérios de qualidade
- Cada problema tem duas localizações (ficheiro e linha).
- Zero falsos positivos por ignorar uma passagem de tempo explícita.
- As saídas automáticas são citadas.

## Dependências
`cwos validate`, `cwos mentions`, `cwos deps`, `cwos canon-diff`. Agent: `continuity-editor`.
