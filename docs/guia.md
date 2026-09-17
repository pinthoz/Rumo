# Guia de uso

## Todos os dias (5 minutos)

| quando | o quê | comando |
|---|---|---|
| ao abrir o Claude Code | as prioridades do dia aparecem sozinhas, numa linha | (automático) |
| de manhã | ver as 3 prioridades do dia e o primeiro passo de cada | `/hoje` |
| para começar a trabalhar, ou quando se perde | escolher UMA coisa e arrancar um bloco de 25 min com aviso no fim | `/foco` (ou `/foco IRS 10`) |
| quando surge uma ideia a meio de outra coisa | apontar e voltar ao que se estava a fazer | `/captura comprar pilhas` |
| quando uma tarefa não arranca | conversa de 2 minutos para a desbloquear | `/travado IRS` |
| ao fim do dia | marcar o que ficou feito e passar o resto para amanhã | `/feito` (ou `/feito ligar à Joana`) |

**Lembretes automáticos** (`/lembretes`): notificações no computador (Windows ou Mac):
- de manhã, com as prioridades;
- à tarde, se houver prazos do dia por cumprir;
- ao fim do dia, para fechar o dia;
- ao domingo, para a revisão semanal.

Os horários são ajustáveis e cada lembrete pode ser desligado. Só aparecem com o computador ligado.

Contas e hábitos que se repetem levam `*mensal`, `*semanal`, etc. na tarefa (por exemplo, `Pagar renda ^2026-10-08 *mensal`). Ao marcar a tarefa como feita, a seguinte é criada sozinha.

## Todas as semanas (15–20 minutos)
- `/semana`: o que foi feito, o que se larga e as 3 prioridades da semana seguinte.
- `/gastos`: importar o extrato do banco (CSV) e categorizar.

## Todos os meses
- `/financas`: resumo do mês face ao orçamento, quanto ainda pode gastar, despesas fixas e subscrições, e património.
- Atualizar os saldos das contas (poupança, investimentos).

## Quando for preciso
| preciso de… | comando |
|---|---|
| perceber se vale a pena um investimento | `/investir PPR ou certificados de aforro?` |
| discutir uma ideia a sério | `/pensar acho que trabalhar a partir de casa baixa a produtividade` |
| corrigir um email em português | `/pt profissional <texto>` |
| corrigir ou escrever melhor em inglês | `/en profissional uk <texto>` |
| ver se um texto está coerente e soa a ele | `/rever cronica.md coerência` · `/rever cronica.md tom` |
| desbloquear uma história | `/rever desbloquear <ideia>` |
| trabalhar numa obra longa (romance, série) | `/project new …`, depois `/brief` · `/critique` · `/continuity` (ver `escrita/docs/workflow.md`) |

## Rumo: o painel no Claude (navegador e telemóvel)
1. `/rumo`: publica o painel na tua conta (uma vez). Fica privado e pode ser fixado na barra lateral do claude.ai.
2. Usa-o fora do computador: prioridades, foco, gastos, corretor…
3. `/sincronizar` (ou `/sincronizar simular` para ver antes): junta o painel com o `tarefas.md` e as finanças daqui, nos dois sentidos.
   - O que foi feito ou apagado num lado passa para o outro.
   - Se a mesma tarefa mudou nos dois lados, fica a da página (e uma tarefa feita nunca volta a ficar por fazer). O relatório mostra os conflitos.
4. Sem Claude Code: os botões "Descarregar tarefas.md", "Importar tarefas.md" e "Descarregar este mês (CSV)" fazem o mesmo à mão.
5. Perguntas com dados atuais (taxas, notícias): o botão "Pesquisar no Claude" copia a pergunta, com regras de fontes, para uma conversa normal, que tem pesquisa na web.

## Regras de ouro para não se perder
1. **Uma conversa, uma área.** Mudar de assunto é abrir uma conversa nova (`/clear`).
2. **Começar pelo comando da área.** O assistente carrega só as regras e os ficheiros dessa área.
3. **Perguntar "de onde vem isso?"** sempre que aparecer um número ou um facto. O assistente é obrigado a dar a fonte ou a dizer que não sabe.
4. **Dizer "isso não é para agora"** quando ele se desviar. Está instruído a voltar ao tema.

## Primeira configuração (uma vez, cerca de 30 minutos)
1. Instalar o [Claude Code](https://claude.com/claude-code) e o Node.js (18 ou superior).
2. Abrir esta pasta no Claude Code.
3. `/hoje`: o assistente faz 5 perguntas e cria a rotina-base.
4. `/lembretes`: escolher os horários das notificações e testar.
5. `/gastos`: exportar um extrato em CSV do homebanking e importá-lo. Depois, `/financas` para definir os objetivos e o orçamento.
6. `/pt` com um texto qualquer, para testar.
7. `/rever` com 3 a 5 textos dele, para criar o perfil da voz (`escrita/voz.md`).
8. Se usar a app Claude (web, telemóvel) em vez do Claude Code: ver [claude-app.md](claude-app.md).
