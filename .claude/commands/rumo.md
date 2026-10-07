---
description: "Publicar (ou atualizar) o Rumo, o painel no Claude, na conta de quem corre o comando"
argument-hint: "[publicar | abrir | link]"
---
O Rumo é a página `prototipo/rumo.html`. Cada pessoa tem de ter a **sua** cópia, publicada a partir da própria conta: os dados da página são privados por conta, e o `/sincronizar` só chega aos dados de quem corre o Claude Code.

1. Lê `config/rumo.json` (fica fora do git, porque o link é de cada pessoa). Se não existir, é o mesmo que não ter `url`; ao gravar o link, cria-o com `{"url": "<link>"}`.
2. **Sem `url`** (ou `publicar` pedido explicitamente sem url):
   - publica `prototipo/rumo.html` com a ferramenta Artifact, com os dois ficheiros ao lado em `files`: `{"rumo.css": "prototipo/rumo.css", "rumo.js": "prototipo/rumo.js"}` (sem eles a página abre sem estilos nem lógica):
     - capabilities `{"db": {}, "user": {}, "sample": {}, "downloads": true, "mcp": {"servers": [{"server": "Gmail", "tools": ["search_threads"]}, {"server": "Google Calendar", "tools": ["list_events", "create_event"]}]}}` — os conectores só funcionam se a pessoa os tiver ligados no claude.ai; sem eles, a página funciona na mesma;
     - favicon 🧭;
     - descrição: "Painel pessoal: prioridades, foco, finanças, pensar, corretor e escrita.";
   - grava o link devolvido em `config/rumo.json` → `url`;
   - diz ao utilizador que a página é privada e que pode fixá-la na barra lateral do claude.ai. Oferece fixar (pin); só fixa se o utilizador disser que sim.
3. **Com `url`:**
   - `publicar` → volta a publicar o mesmo ficheiro com `url` e os mesmos `files` (primeiro `read` do artifact, como a ferramenta exige), sem mudar as capabilities;
   - `abrir` → usa a ação `open`;
   - `link` → mostra o link.
4. No fim, lembra numa linha: para juntar os ficheiros do computador com a página, `/sincronizar`.

Pedido: $ARGUMENTS
