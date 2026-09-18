# Área: Carreira

Serve para **procurar emprego com método**: encontrar vagas que valham a pena, perceber se encaixam antes de gastar tempo com elas, e não perder o fio a cada candidatura (quem respondeu, quando voltar a contactar).

A organização (avaliação por requisitos, lista única de candidaturas, verificação de vagas falsas) inspira-se no [career-ops](https://github.com/career-ops-hq/career-ops) (licença MIT).

## Ficheiros (os dados reais não vão para o git)
| ficheiro | conteúdo |
|---|---|
| `carreira/perfil.md` | cargos que procura, onde, salário mínimo, o que é obrigatório e o que não quer (criado a partir de `perfil.modelo.md`, preenchido com o utilizador) |
| `carreira/cv.md` | o CV em Markdown (criado a partir de `cv.modelo.md`, ou do ficheiro do utilizador com `/cv`); é a única fonte sobre a experiência do utilizador. Só este Markdown é sincronizado com o painel: o PDF ou o Word originais nunca são copiados nem enviados |
| `carreira/fontes.csv` | onde procurar (`fonte;alvo;nome;palavras;local`), criado a partir de `fontes.modelo.csv` |
| `carreira/candidaturas.csv` | uma linha por candidatura (`id;empresa;cargo;local;estado;nota;data;proximo;fonte;link;obs`) |
| `carreira/vagas.csv` | todas as vagas que a procura já encontrou, para não as mostrar duas vezes |
| `carreira/relatorios/` | avaliações de vagas (`AAAA-MM-DD-empresa-cargo.md`) |

**Contas e mudanças fazem-se com `node scripts/carreira.mjs`** (`procurar`, `novas`, `guardar`, `adicionar`, `mudar`, `lista`, `resumo`, `agenda`). Nunca contes candidaturas nem calcules taxas de cabeça, e não edites os CSV à mão quando há um comando para isso.

Estados de uma candidatura, por ordem: `guardada` → `candidatei` → `entrevista` → `proposta` → `aceite`; e os que fecham: `recusada`, `sem-resposta`, `desisti`.

## Workflow

1. **Preparar:** preencher `perfil.md` e `cv.md` uma vez; rever quando o objetivo mudar.
2. **Encontrar:** `/procurar <cargo> <local>` usa filtros pontuais sem obrigar a editar ficheiros.
3. **Decidir:** `/vaga <link ou id>` avalia antes de gastar tempo na candidatura.
4. **Acompanhar:** `/candidaturas` dá uma agenda ordenada e começa por uma única ação concreta.

Nenhuma vaga guardada fica sem destino: até ser enviada ou fechada, a agenda pede para a avaliar e decidir.

## Regras desta área
1. **O utilizador decide e o utilizador envia.** Nunca se candidata, envia emails ou mensagens em nome do utilizador. Cartas, emails e mensagens para recrutadores são sempre **rascunhos**, entregues para o utilizador rever.
2. **LinkedIn só a pedido e sem sessão.** Pesquisa-se com WebSearch (`site:linkedin.com/jobs/view …`), um pedido de cada vez, e conservam-se os dados visíveis no resultado. Não abras as vagas com WebFetch só para as confirmar: a parede de login não deve apagar um resultado válido; o que não estiver no excerto fica “não confirmado”. **Nunca** iniciar sessão, usar cookies, automatizar o navegador ou repetir pedidos em série: os termos do LinkedIn proíbem recolha automática e quem arrisca a conta é o utilizador. Para consultar mais detalhes, o utilizador abre a pesquisa ou a vaga na própria sessão.
3. **O que a vaga diz vem da vaga.** Requisitos, local e condições citam o texto. Salários, dimensão da empresa ou notícias sobre ela só com pesquisa e fonte: `[Verificado: fonte, data]`. Sem fonte: `[Não sei]`.
4. **O CV não se inventa.** Encaixes e lacunas comparam com o que está em `cv.md`. Pode-se sugerir como apresentar melhor uma experiência que lá está; nunca acrescentar uma que não está.
5. **Sinais de alerta explícitos.** Vaga sem empresa identificável, que pede pagamento, dados bancários ou documentos antes de uma entrevista, ou repetida há meses: diz-se claramente, com o motivo.
6. **Sem julgamentos** sobre recusas ou silêncios. Mostram-se os números (`resumo`) e o próximo passo.
7. **As fontes têm regras.** O script consulta cada linha de `fontes.csv` no máximo uma vez por dia e guarda sempre o link original e a fonte, que é o que o Remotive e o Remote OK pedem. Não acrescentes mais de 4 linhas da mesma fonte agregadora.
