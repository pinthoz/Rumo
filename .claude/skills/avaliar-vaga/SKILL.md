---
name: avaliar-vaga
description: Área Carreira. Avalia uma vaga de emprego (texto colado ou link) contra o CV e o perfil do utilizador, requisito a requisito, com sinais de alerta, perguntas para a entrevista e uma nota de 1 a 5, e guarda-a na lista de candidaturas se o utilizador quiser. Usar com /vaga ou quando o utilizador cola uma oferta de emprego.
argument-hint: "[texto da vaga | link | id de uma vaga encontrada]"
---
# avaliar-vaga

## Propósito
Decidir depressa se uma vaga vale uma candidatura, com base no que a vaga diz e no que o CV do utilizador mostra, sem inventar nenhum dos dois.

## Quando usar
- O utilizador cola o texto de uma vaga ou um link.
- O utilizador indica o id de uma vaga que a procura encontrou (ex.: `gh-5421031008`).
- O utilizador pergunta "esta vaga é para mim?".

## Quando NÃO usar
- Procurar vagas novas: usa `procurar-vagas`.
- Ver ou mudar o estado das candidaturas: é o comando `/candidaturas`.
- Rever o texto de uma carta ou de um email: é a área Língua (`/pt`, `/en`).

## Processo
1. **Ler os dados do utilizador.** `carreira/cv.md` e `carreira/perfil.md`. Se não existirem, copia-os dos `.modelo.md` e pede ao utilizador que os preencha antes de avaliar: sem CV, a avaliação seria inventada. Não uses informação de outras áreas.
2. **Obter o texto da vaga.**
   - Texto colado: usa-o tal como está.
   - Id de uma vaga encontrada: procura-a em `carreira/vagas.csv` e lê o link.
   - Link: lê-o com WebFetch, **uma vez**. Se for do LinkedIn e pedir login, ou se vier incompleto, pede ao utilizador que cole o texto. Nunca inicies sessão nem tentes contornar o login.
3. **Avaliar**, sempre a citar a vaga e o CV:
   1. **O cargo numa frase** e o que a empresa faz (só com o que a vaga diz, ou com fonte).
   2. **Requisito a requisito**, numa tabela: requisito · obrigatório ou desejável · encaixe (sim / parcial / não) · evidência no CV (citação curta) ou "não aparece no CV".
   3. **Lacunas** que pesam e como as enfrentar com o que o utilizador já tem (sem inventar experiência).
   4. **Condições** contra o perfil: local, modelo de trabalho, salário, contrato. O que a vaga não diz fica "não indicado".
   5. **Salário de referência**, só se o utilizador pedir ou se a vaga for omissa e isso pesar: pesquisa e indica `[Verificado: fonte, data]`, ou `[Não sei]`.
   6. **Sinais de alerta**: empresa não identificável, pedidos de pagamento ou de dados bancários, promessas vagas, vaga repetida há meses. Se não houver, diz "nenhum encontrado".
   7. **Três perguntas para a entrevista**, que tirem as dúvidas que a vaga deixa.
   8. **Nota de 1 a 5**, com uma linha de justificação: 5 = encaixa nos obrigatórios e no perfil; 3 = encaixa em parte, vale a pena se as condições forem boas; 1 = falha um obrigatório do utilizador ou da vaga.
4. **Guardar o relatório** em `carreira/relatorios/AAAA-MM-DD-empresa-cargo.md` (nomes em minúsculas, com hífenes).
5. **Perguntar se a quer na lista.** Com um sim:
   - vaga encontrada pela procura: `node scripts/carreira.mjs guardar <id> --nota <n>`;
   - vaga de fora: `node scripts/carreira.mjs adicionar --empresa "…" --cargo "…" --link "…" --local "…" --fonte <linkedin|site|…> --nota <n>`.
   Se o script disser que já está na lista, não a acrescentes outra vez.
6. **Carta ou email**, só se o utilizador pedir: rascunho curto, com as palavras-chave da vaga e só experiências que estão no CV. Nunca envies.

## Output
A tabela de requisitos, as lacunas, as condições, os alertas, as três perguntas e a nota. No fim, uma linha: guardada ou não, e onde está o relatório.

## Critérios de qualidade
- Cada encaixe tem uma citação do CV; cada requisito, uma da vaga.
- Nenhuma experiência, certificação ou número aparece se não estiver no CV.
- Salários e factos sobre a empresa têm fonte e data, ou `[Não sei]`.
- Nada é enviado; as cartas e emails são rascunhos.

## Dependências
`carreira/cv.md`, `carreira/perfil.md`, `scripts/carreira.mjs`, WebFetch (links), WebSearch (salários e empresa).
