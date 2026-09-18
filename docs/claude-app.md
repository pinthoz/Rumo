# Usar na app Claude (sem Claude Code)

O sistema foi feito para o **Claude Code**, que lê e escreve ficheiros e corre os scripts. Na app Claude (web, desktop, telemóvel) não há scripts, mas a parte mais importante, **não misturar assuntos**, reproduz-se com **Projetos**.

## Um Projeto por área
Cria um Projeto na app para cada área e, nas instruções do projeto, cola o conteúdo destes ficheiros:

| Projeto | instruções (colar) | ficheiros de conhecimento (opcional) |
|---|---|---|
| Rotina | `CLAUDE.md` (secções "Regra 1" a "Regra 4") + `rotina/CLAUDE.md` + `.claude/skills/planear-dia/SKILL.md` + `desbloquear` | `rotina/rotina.md` |
| Finanças | regras gerais + `financas/CLAUDE.md` + skills `financas-analise` e `investimentos` | exportações do resumo (não os extratos completos) |
| Pensar | regras gerais + `pensar/CLAUDE.md` + skill `parceiro-pensamento` | — |
| Língua | regras gerais + `lingua/CLAUDE.md` + skills `corretor-pt` e `corretor-en` | `lingua/erros-frequentes.md` |
| Escrita | regras gerais + `escrita/CLAUDE.md` (secção "Dois modos") + skill `rever-texto` | `escrita/voz.md` e alguns textos do utilizador |

## Memória e mistura de contextos
O problema de o assistente "trazer coisas que sabe de mim" vem normalmente da **memória** e da **pesquisa em conversas antigas**. A app tem definições para as controlar. Confirma na versão atual onde estão (costumam estar nas definições da conta, em funcionalidades ou privacidade), porque os nomes mudam. Recomendação:
- **Desligar** a pesquisa e referência a conversas anteriores, ou mantê-la só dentro de cada Projeto.
- Rever periodicamente o que está guardado em memória e apagar o que não serve.
- **Uma conversa por assunto.** Quando a conversa ficar longa ou mudar de tema, abrir uma nova.

## Limitações na app
- Não há contas automáticas: os resumos financeiros ficam menos rigorosos. Para controlo financeiro a sério, usar o Claude Code (ou uma folha de cálculo que o assistente ajude a montar).
- As tarefas não ficam num ficheiro partilhado. Alternativa: a app de tarefas que o utilizador já usa, com o assistente só a ajudar a planear.
