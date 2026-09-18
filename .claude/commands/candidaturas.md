---
description: "Carreira: saber o próximo passo e atualizar candidaturas"
argument-hint: "[agenda | resumo | lista | <empresa ou id> <novo estado> | procura diária]"
---
[Área: Carreira]. Segue as regras de `carreira/CLAUDE.md` e não uses informação de outras áreas.

Tudo passa por `node scripts/carreira.mjs`; os números vêm sempre do script.

**Vazio ou agenda:** corre `node scripts/carreira.mjs agenda`. Mostra primeiro uma única ação — a primeira da agenda — e pergunta se quer fazê-la agora. Só mostra a lista completa se o utilizador pedir. Para `resumo`, corre o resumo do script.

**lista:** corre o comando lista do script (acrescenta `--todas` se o utilizador pedir as fechadas).

**Mudar o estado** (ex.: "candidatei-me à Catawiki", "a Anthropic recusou"):
1. Encontra o id com o comando lista do script (acrescenta `--todas` se a candidatura já estiver fechada). Se houver mais de uma candidatura possível, pergunta qual.
2. `node scripts/carreira.mjs mudar <id> <estado>`, com `--obs "…"` se o utilizador contou algo útil (data da entrevista, com quem falou).
3. Estados: guardada, candidatei, entrevista, proposta, aceite, recusada, sem-resposta, desisti. Ao passar a candidatei, o script marca o próximo contacto para daqui a 7 dias; a entrevista, para daqui a 3. Se o utilizador indicar outra data, usa `--proximo AAAA-MM-DD`.
4. Confirma numa linha o que mudou, tal como o script o escreveu.

**Procura diária:** a procura automática instala-se com os lembretes: `node scripts/lembretes.mjs instalar --vagas 08:30 --dry`, e depois sem `--dry` quando o utilizador confirmar. Consulta só as fontes com API (nunca o LinkedIn) e mostra uma notificação quando há vagas novas.

Recusas e silêncios mostram-se sem comentários: o número e o próximo passo. Uma vaga guardada não fica esquecida: aparece na agenda até ser avaliada, enviada ou fechada.

Pedido: $ARGUMENTS
