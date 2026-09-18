---
name: procurar-vagas
description: Área Carreira. Procura vagas de emprego a pedido, juntando as fontes com API pública (Landing.jobs, ITJobs, Greenhouse, Ashby, Lever, Remotive, Remote OK, Arbeitnow, Himalayas) com uma pesquisa no LinkedIn sem sessão iniciada, sem repetidos, e deixa escolher o que guardar. Usar com /procurar ou quando o utilizador pede vagas.
argument-hint: "[palavras e local, ex.: machine learning lisboa]"
---
# procurar-vagas

## Propósito
Uma lista curta de vagas novas e relevantes, de várias fontes, sem o utilizador ter de abrir cinco sites, e sem arriscar a conta do LinkedIn.

## Quando usar
- "Procura vagas de …", "há vagas novas?".
- O utilizador quer acrescentar ou mudar onde se procura (`carreira/fontes.csv`).

## Quando NÃO usar
- Avaliar uma vaga concreta: usa `avaliar-vaga`.
- Ver as candidaturas: é o comando `/candidaturas`.

## Processo
1. **Palavras e local.** Usa as do pedido; se não houver, as de `carreira/perfil.md` (secção "Palavras para a procura"). Se nenhum dos dois as tiver, pergunta.
2. **Fontes com API.** Corre `node scripts/carreira.mjs procurar --palavras "<palavras>" --local "<local>"`. Omite apenas o filtro que a pessoa não indicou.
   - O script consulta cada linha de `carreira/fontes.csv` no máximo uma vez por dia. Se tudo foi consultado hoje, usa `node scripts/carreira.mjs novas` em vez de forçar. Só uses `--forcar` se o utilizador mudou as fontes agora.
   - Uma pesquisa pontual nunca exige alterar `fontes.csv`: os dois filtros acima aplicam-se temporariamente a todas as fontes configuradas. Só propõe alterar o ficheiro quando a pessoa disser que quer guardar essa pesquisa como habitual.
   - Para uma empresa concreta, descobre se usa Greenhouse, Ashby ou Lever pelo link da página de carreiras do utilizador (`boards.greenhouse.io/<alvo>`, `jobs.ashbyhq.com/<alvo>`, `jobs.lever.co/<alvo>`).
3. **LinkedIn, sem sessão.** Faz primeiro uma WebSearch própria: `<palavras> <local> site:linkedin.com/jobs/view`.
   - Conserva os links diretos, títulos, empresas e locais visíveis nos resultados da pesquisa. Não tentes abrir essas páginas com WebFetch: a parede de login não invalida o resultado público e não deve fazer desaparecer a vaga.
   - Se a modalidade ou outro filtro não estiver no excerto, marca-o como “não confirmado”; exclui apenas o que contrariar claramente o filtro.
   - Nunca inicies sessão, uses cookies, abras vagas uma a uma em série nem repitas a pesquisa em ciclo. Se não houver resultados públicos, diz isso e segue com o resto.
4. **Juntar e tirar repetidos.** Uma vaga do LinkedIn que já está na lista do script (mesma empresa e mesmo cargo) conta uma vez; fica o link da fonte original.
5. **Mostrar.** No máximo 10, as que melhor batem com o perfil, numa tabela: cargo · empresa · local · fonte · link. Começa pelas três melhores. Diz quantas ficaram de fora e porquê (local, senioridade, palavras).
6. **Guardar o que o utilizador escolher.**
   - Da procura: `node scripts/carreira.mjs guardar <id>`.
   - Do LinkedIn: `node scripts/carreira.mjs adicionar --empresa "…" --cargo "…" --link "<link>" --local "…" --fonte linkedin`.
   - Para avaliar alguma a fundo, passa para `avaliar-vaga`. Depois de guardar, lembra que ela aparece em `/candidaturas` até haver uma decisão.

## Output
A tabela de vagas, com a fonte de cada uma, e uma linha com o que foi guardado.

## Critérios de qualidade
- Cada vaga tem o link original e a fonte (é o que o Remotive e o Remote OK pedem).
- Nenhum pedido ao LinkedIn com sessão; no máximo uma pesquisa e uma leitura por pedido do utilizador.
- Nada é guardado sem o utilizador escolher.
- As contagens vêm do script.

## Dependências
`scripts/carreira.mjs`, `carreira/fontes.csv`, `carreira/perfil.md`, WebSearch, WebFetch.
