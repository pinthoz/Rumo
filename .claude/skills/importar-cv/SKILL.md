---
name: importar-cv
description: Área Carreira. Lê um CV que o utilizador já tem (PDF, Word, texto ou link) e preenche com esse conteúdo o carreira/cv.md, mantendo a estrutura do modelo e sem inventar nada. Usar com /cv ou quando o utilizador diz "toma lá o meu CV", "preenche isto a partir do meu currículo".
argument-hint: "[caminho do ficheiro | texto colado]"
---
# importar-cv

## Propósito
Passar o CV que o utilizador já tem para `carreira/cv.md`, na estrutura que o resto da área usa, para não ter de o escrever à mão.

## Quando usar
- O utilizador indica um ficheiro (`/cv Documentos/cv.pdf`) ou cola o texto do CV.
- No painel, o PDF é lido pelo próprio navegador; aqui trata-se do CV que está no computador (incluindo Word e PDF digitalizado).
- `carreira/cv.md` está por preencher e o utilizador quer avaliar vagas.
- O utilizador quer atualizar o CV com uma experiência nova a partir de um ficheiro novo.

## Quando NÃO usar
- Escrever ou melhorar o texto do CV: isso é escrita, e o CV é do utilizador. Aqui só se transcreve e organiza.
- Avaliar uma vaga: `avaliar-vaga`.
- Preencher o que o utilizador procura (cargos, salário, local): isso é `carreira/perfil.md`, e pergunta-se ao utilizador.

## Inputs
O ficheiro indicado (PDF, Word, Markdown, texto) ou o texto colado, e `carreira/cv.modelo.md` como estrutura. Não uses informação de outras áreas nem de conversas antigas.

## Processo
1. **Encontrar o ficheiro.** Se o utilizador não indicar caminho, pergunta pelo utilizador (ou aceita o texto colado). Se o caminho falhar, diz o que tentaste e pede o caminho certo; não adivinhes ficheiros parecidos.
2. **Ler o conteúdo.**
   - PDF: lê-o com a ferramenta Read (que os abre por páginas).
   - Word (`.docx`): usa a skill `docx` se estiver disponível; senão, pede ao utilizador que exporte para PDF ou cole o texto.
   - Markdown ou texto: lê o ficheiro.
   - Link (LinkedIn, página pessoal): WebFetch **uma vez**; se pedir sessão, pede ao utilizador o texto.
3. **Preencher a estrutura de `cv.modelo.md`**, secção a secção: cabeçalho (nome, cidade, contactos), Resumo, Experiência, Projetos, Formação, Competências.
   - **Transcreve, não escrevas.** Cada linha sai do documento do utilizador. Podes cortar repetições, uniformizar datas (`AAAA-MM`) e passar parágrafos a pontos.
   - **Nada de inventar:** não acrescentes resultados, números, tecnologias nem responsabilidades que o documento não tenha.
   - O que o documento não disser fica como `(por preencher)` — nunca preenchido a adivinhar.
   - Mantém a língua do CV original.
4. **Mostrar antes de gravar.** Apresenta o resultado (ou as diferenças, se `cv.md` já existir) e a lista do que ficou `(por preencher)`. **Só gravas depois de o utilizador confirmar.**
5. **Gravar** em `carreira/cv.md`. Se o ficheiro já existir, guarda a versão anterior em `.sync/backups/cv/AAAA-MM-DD-HH-MM.md` antes de escrever.
6. **Fechar com o que falta:** no máximo 3 perguntas sobre o que ficou por preencher e que mais pesa numa candidatura (datas, resultados, contactos). Se `carreira/perfil.md` ainda estiver por preencher, oferece uma vez tratar disso a seguir.

## Output
```
CV lido: cv.pdf (3 páginas)
Preenchido: cabeçalho, 4 experiências, 2 projetos, formação, competências
Por preencher: datas do primeiro emprego · resultados do projeto X · LinkedIn

Gravo em carreira/cv.md? (sim/não)
```

## Critérios de qualidade
- Tudo o que está no `cv.md` aparece no documento original.
- A estrutura é a do `cv.modelo.md`, para a avaliação de vagas encontrar cada secção.
- O que falta está assinalado como `(por preencher)`, não preenchido a adivinhar.
- Nada é gravado sem confirmação do utilizador, e o ficheiro anterior fica guardado.
- O ficheiro original não é copiado para o repositório nem enviado para lado nenhum.

## Dependências
`carreira/cv.modelo.md`, `carreira/cv.md`. Relacionadas: `avaliar-vaga` (usa o CV), `procurar-vagas`.
