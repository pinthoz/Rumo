# O que o sistema faz, e o que não consegue fazer

## Problema: "começa a alucinar e a meter assuntos que conhece de mim"

| causa | o que o sistema faz |
|---|---|
| Mistura de áreas na mesma conversa | Regra 1 do `CLAUDE.md`: uma área por conversa, declarada no início; regras de área só carregadas na pasta dessa área |
| Memória e conversas antigas | Proibido usar sem perguntar; recomendação de rever as definições de memória ([claude-app.md](claude-app.md)) |
| Respostas longas que abrem temas novos | Respostas curtas por omissão; no máximo 1 "Extra (podes ignorar)" |
| Factos e números inventados | Regra 2: fonte e data obrigatórias, etiquetas `[Verificado]`/`[Não sei]`, pesquisa na web para números do mundo |
| Contas erradas | Somas, orçamentos e património calculados por scripts testados, e nunca pelo modelo |

## Limites honestos
- **Não há garantia de zero erros.** O modelo pode errar mesmo com estas regras. As regras reduzem o risco e tornam os erros **visíveis** (fontes, etiquetas). Perguntar "de onde vem isso?" continua a ser a melhor defesa.
- **Não é um consultor financeiro certificado.** Explica, compara e organiza; as decisões e a confirmação com um profissional são do utilizador.
- **Não substitui apoio profissional** quando a procrastinação está ligada a ansiedade, depressão, PHDA, etc. O assistente pode sugerir falar com um profissional de saúde, com cuidado e sem diagnosticar.
- **Os extratos bancários variam.** O importador reconhece os formatos comuns (colunas Data/Descrição/Montante ou Débito/Crédito, números à portuguesa). Um banco diferente pode precisar de `--colunas`. Por isso é preciso um extrato real do utilizador para testar.
- **Só funciona se for usado.** O sistema foi desenhado para ser pequeno (3 prioridades, revisões de 15 minutos), mas a rotina de abrir o `/hoje` é do utilizador.
