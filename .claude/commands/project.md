---
description: "Criar, listar ou mudar de projeto"
argument-hint: "[new <slug> --profile short|long|universe --title \"T\" | use <slug> | status]"
---
- `new …` / `use …`: corre `node scripts/cwos.mjs <args>`.
- `status` (ou vazio): mostra o projeto ativo, as pastas em `escrita/projetos/`, a fase (`phase` no PROJECT.md), `cwos validate` e `cwos wc`.

Depois de mudar de projeto, avisa que o `PROJECT.md` importado só é recarregado numa nova sessão; até lá, lê o novo `PROJECT.md` diretamente.

Pedido do autor: $ARGUMENTS
