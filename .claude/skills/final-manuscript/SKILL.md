---
name: final-manuscript
description: Prepara o manuscrito para entrega/publicação — QA final, montagem das cenas por ordem, formatação, metadados e exportação — sem introduzir conteúdo novo. Usar em modo FINAL.
argument-hint: "[formato: md | docx | pdf]"
---
# final-manuscript

## Propósito
Transformar cenas aprovadas num manuscrito único, limpo e verificável.

## Quando usar
- Todas as cenas do âmbito estão em `stage: final` (ou o autor aceita explicitamente que não estejam).

## Quando NÃO usar
- Há P0 ou P1 abertos: volta a EDIT.

## Processo
1. **Pré-condições automáticas:**
   - `cwos validate` sem erros;
   - `cwos canon-diff <ref da última entrega ou HEAD>` sem promoções por registar;
   - `cwos mentions` sem nomes por indexar nem grafias inconsistentes (ou com justificação);
   - `cwos cliches` revisto;
   - `cwos wc` comparado com `target_words`.
2. **QA:** delega no agent `quality-controller` (todos os gates). Um veredicto BLOQUEADO para o processo.
3. **Montagem:** pela ordem de `story/outline.md`, concatena a secção `## Texto` de cada cena para `export/<slug>-final.md` (pasta ignorada pelo `cwos`, para não duplicar contagens), com títulos de capítulo e quebras de cena (`* * *`). Scene sheets e comentários HTML **não** entram.
4. **Formatação:** pt-PT (travessões, aspas angulares « » para citações, reticências …), sem espaços duplos, capítulos numerados conforme o `PROJECT.md`.
5. **Metadados:** título, autor, data, contagem de palavras, versão (hash do commit).
6. **Exportação:** Markdown por omissão. Para DOCX ou PDF, usa pandoc se estiver instalado (`pandoc --version`). Se não estiver, entrega o Markdown e indica o comando. Se o autor o pedir, pode partilhar via um MCP de documentos disponível (Google Drive, Notion ou Claude Docs), confirmando antes, porque é uma publicação externa.
7. Sugere ao autor um commit ou tag (`git tag v1.0-entrega`). Não o faças sem pedido.

## Output
O manuscrito final, o relatório de QA e uma lista de pendências (se houver).

## Critérios de qualidade
- O texto é idêntico ao das cenas aprovadas (apenas montagem e formatação).
- Todos os gates foram avaliados.
- A versão é rastreável.

## Dependências
Todos os comandos `cwos`. Agent: `quality-controller`. Pandoc (opcional).
