# Conector de pesquisa para o Rumo

## O problema
Dentro do Rumo, o Claude não tem acesso à internet e a página não pode fazer pedidos para fora. A exceção são os **conectores** que a pessoa tem no claude.ai: a página pode chamá-los com a conta do utilizador (capacidade `mcp`) e pode dá-los ao Claude como ferramenta durante uma resposta (opção `tools` do `sample`).

## Opções

### 1. Usar um conector que já exista
Verificar no claude.ai (Definições → Conectores) se há um conector de pesquisa na web disponível para a conta do utilizador. Se houver, basta ligá-lo e adaptar o Rumo, **sem servidor próprio**.
- A confirmar: que conectores existem hoje e em que planos.

### 2. Construir um conector próprio
Um pequeno servidor MCP remoto com duas ferramentas:
- `pesquisar(pergunta)`: devolve título, link, excerto e data de cada resultado;
- `ler(url)`: devolve o texto principal de uma página.

| peça | o que é preciso | a confirmar |
|---|---|---|
| Motor de pesquisa | uma API de pesquisa com chave (há vários fornecedores) | preço, limites e termos atuais do fornecedor escolhido |
| Alojamento | uma função na cloud (por exemplo, Vercel) | plano e limites |
| Segurança | autenticação (OAuth ou segredo), para só o utilizador o usar e para a chave da API não ficar exposta | o que o claude.ai suporta em conectores próprios |
| Ligação | adicionar o URL como conector personalizado no claude.ai | se o plano do utilizador permite conectores personalizados |

### Depois, no Rumo
- a página declara o conector (`mcp`: nome do servidor e as duas ferramentas);
- em Investir e Pensar, o Claude recebe `pesquisar` e `ler` como ferramentas e responde com fontes e datas;
- sem o conector, a página continua como está (botão "Pesquisar no Claude").

## Custos e cuidados
- A API de pesquisa tem custo por pedido acima do escalão gratuito, se houver. Deve haver um limite mensal.
- Cada resposta com pesquisa gasta mais utilização do Claude, porque há várias rondas.
- As perguntas passam pelo fornecedor da pesquisa: não enviar dados pessoais nas pesquisas (o Rumo só envia a pergunta, sem os números do utilizador).

## Recomendação
Primeiro a opção 1, verificada na conta do utilizador. A opção 2 vale a pena se o utilizador usar muito "Investir" e "Pensar" no Rumo. Até lá, o botão "Pesquisar no Claude" resolve sem custo extra.
