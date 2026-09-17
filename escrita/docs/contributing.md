# Contribuir

Este guia serve tanto para escritores e colaboradores que vão usar o sistema como para quem o vai manter.

## Primeiros passos (escritor)

1. Requisitos: [Claude Code](https://claude.com/claude-code), Node ≥ 18 e git.
2. Abre a pasta do repositório no Claude Code.
3. Cria um projeto:
   ```bash
   node scripts/cwos.mjs new o-meu-conto --profile short --title "O Meu Conto"
   ```
   Perfis: `short` (conto, poema, ensaio), `long` (novela, romance, série) e `universe` (universo partilhado).
4. Abre uma **nova sessão**, para que o `PROJECT.md` do projeto seja carregado.
5. Segue o pipeline: `/brief <ideia>` → `/architect` → `/character` → `/outline` → `/scene sc-01` → `/draft sc-01` → `/critique sc-01` → …

Ver `escrita/docs/workflow.md` para os pipelines reduzidos.

## Regras de colaboração

- **O autor decide.** A IA propõe (`PROPOSTA`) e o autor aprova (`CANON`) com uma entrada em `editorial/decisions.md`.
- **Um commit por etapa**, com a mensagem `<slug>: <etapa> — <resumo>`. Antes de uma reescrita grande, faz sempre commit.
- **Antes de um commit:** `npm run check` (validate + index).
- **Nunca apagues canon:** muda o estado ou arquiva.
- **Colaboradores humanos** seguem as mesmas regras de frontmatter. O `cwos validate` apanha os erros mecânicos.

## Manter o sistema

| alterar | onde | cuidado |
|---|---|---|
| regra global | `CLAUDE.md` | manter curto; é carregado sempre |
| procedimento | `.claude/skills/<nome>/SKILL.md` | não duplicar regras do CLAUDE.md |
| papel ou ferramentas de um especialista | `.claude/agents/<nome>.md` | `tools` mínimas; procedimento via `skills:` |
| atalho | `.claude/commands/<nome>.md` | só encaminhar; não pode ter o mesmo nome de uma skill |
| formato de documento | `escrita/templates/` | se mudar o frontmatter, atualizar `scripts/cwos.mjs` e `escrita/docs/canon.md` |
| automação | `scripts/cwos.mjs` | zero dependências; acrescentar teste em `cwos.test.mjs` |

Depois de alterar scripts: `npm test`. Depois de alterar skills, agents ou commands: abrir uma nova sessão e testar o comando correspondente.

### Checklist para uma alteração ao sistema

- [ ] A informação existe num só sítio?
- [ ] Uma solução mais simples produzia o mesmo resultado?
- [ ] Se é mecânica, está no script e tem teste?
- [ ] A documentação em `escrita/docs/` foi atualizada?
- [ ] O projeto de demonstração (`escrita/projetos/o-livro-de-registos`) continua a validar?

## Estrutura de referência

Ver `escrita/docs/architecture.md`.
