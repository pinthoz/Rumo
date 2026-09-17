# MCPs e ferramentas externas

Princípio: **nenhuma ferramenta é usada só porque existe.** Cada uma tem uma função clara no workflow. O sistema funciona sem MCPs externos: filesystem e git são nativos do Claude Code, e a pesquisa usa WebSearch/WebFetch.

## Auditoria (2026-09-16, ambiente local de desenvolvimento)

| capacidade | disponível como | classificação | função no workflow |
|---|---|---|---|
| Pesquisa web | WebSearch (nativo) | **ESSENCIAL** | `research`, `fact-check` |
| Leitura de páginas | WebFetch (nativo) | **ESSENCIAL** | ler as fontes encontradas |
| Filesystem | Read/Write/Edit/Grep/Glob (nativo) | **ESSENCIAL** | bible, manuscrito, relatórios |
| Git | CLI `git` | **ESSENCIAL** | histórico, `canon-diff`, comparação de versões |
| Scripts | Node 24 (`cwos`) | **ESSENCIAL** | validação e automação |
| Consensus | MCP claude.ai (**requer autenticação**) | ÚTIL | literatura científica para ficção científica ou médica |
| Google Drive | MCP claude.ai | OPCIONAL | partilhar ou exportar o manuscrito, importar notas do autor |
| Notion | MCP claude.ai | OPCIONAL | importar notas e bibles já existentes em Notion |
| Claude Docs | MCP claude.ai | OPCIONAL | documento colaborativo para revisão com terceiros |
| Canva | MCP claude.ai | OPCIONAL | capas e materiais de divulgação (fora do núcleo) |
| Browser (Chrome headless) | instalado localmente | OPCIONAL | verificação visual de fontes que o WebFetch não lê |
| Pandoc | não verificado | OPCIONAL | exportar DOCX/PDF em `final-manuscript` |
| Neon (Postgres) | MCP | DESNECESSÁRIO | a bible em Markdown com frontmatter chega; ver "Base de conhecimento" |
| Gmail, Calendar, Microsoft 365 | MCP claude.ai | DESNECESSÁRIO | fora do âmbito |
| Hugging Face, football-docs, Vercel | MCP / plugin | DESNECESSÁRIO | fora do âmbito |
| Ahrefs, Kiwi, Strava, tldraw | MCP (requerem autenticação) | DESNECESSÁRIO | fora do âmbito |

Os MCPs que requerem autenticação só funcionam depois de autorizados nas definições de conectores do claude.ai (ou com `/mcp` numa sessão interativa).

## Regras de uso

1. **Pesquisa:** só nas skills `research` e `fact-check` e nos agents `researcher` e `fact-checker`, que são os únicos com WebSearch/WebFetch.
2. **Publicação externa** (Drive, Notion, Docs, Gmail): só com pedido explícito do autor e confirmação antes de enviar. Enviar é publicar.
3. **Importação:** o que é importado de Notion ou Drive entra como `PROPOSTA` ou `PROVISIONAL`, nunca como CANON automático.
4. **Sem MCP disponível:** o sistema diz que não tem o acesso e marca a informação como não verificada.

## Adicionar um MCP ao projeto

Para um servidor partilhado por todos os colaboradores, cria `.mcp.json` na raiz:

```json
{
  "mcpServers": {
    "exemplo": { "command": "npx", "args": ["-y", "<pacote-mcp>"] }
  }
}
```

Depois:

1. Classifica-o nesta tabela (essencial, útil, opcional).
2. Diz em que skill ou agent é usado e acrescenta-o às `tools` desse agent (`mcp__<servidor>__<ferramenta>`).
3. Documenta a regra de uso acima.

## Base de conhecimento (futuro)

Se um universo crescer para lá de algumas centenas de entidades, a camada de canon pode migrar para uma base de dados (SQLite ou Postgres via MCP) **sem mudar o modelo**: ids, `type`, `status` e referências. Até lá, Markdown com frontmatter e `cwos index` é mais simples, versionável e legível pelo autor.
