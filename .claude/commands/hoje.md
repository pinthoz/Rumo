---
description: "Rotina: plano do dia, caixa de entrada e emails que pedem ação"
argument-hint: "[notas sobre o dia | sem email]"
---
[Área: Rotina]. Segue as regras de `rotina/CLAUDE.md` e não uses informação de outras áreas.

Usa a skill `planear-dia`.

Se o conector Gmail da conta Claude estiver disponível, deixa a skill consultar os emails relevantes. `sem email` desliga essa consulta apenas nesta execução. A ausência ou falha do Gmail nunca impede o plano local.

**Agenda:** se o conector Google Calendar estiver disponível, lê os eventos da semana atual, de segunda a domingo (é a grelha que o painel mostra) (`list_events`, `orderBy: "startTime"`, no máximo 50) e grava `rotina/agenda.json` com `updatedAt` (ISO) e `items`. Cada item leva só `id`, `summary`, `start`, `end`, `location` e `url`; nunca convidados, descrições nem anexos. Sem conector, não escrevas o ficheiro e diz numa linha `Calendário não ligado`. Usa os compromissos do dia ao propor os blocos de tempo do plano, sem os comentar um a um.

**Depois de gravar `rotina/emails.json` e `rotina/agenda.json`**, se `config/rumo.json` tiver `url`, leva as mesmas listas ao painel do claude.ai: uma chamada Artifact `action: "write_db"` com `db_op: "batch"`, `url`, e uma entrada `set` por documento (`collection: "data/users/me"`, `doc_id: "emails"` e `doc_id: "agenda"`, `data` igual ao conteúdo de cada ficheiro). Sem `url`, salta este passo e não comentes. Se a escrita falhar, diz numa linha que o painel ficou com as listas anteriores; o plano local não depende disto.

Pedido: $ARGUMENTS
