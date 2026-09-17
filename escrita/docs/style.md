# Estilo e voz

## Onde vive o estilo

| ficheiro | conteúdo |
|---|---|
| `escrita/projetos/<slug>/PROJECT.md` | regras criativas fixas (pessoa, tempo verbal, limites de conteúdo) |
| `escrita/projetos/<slug>/project/style-guide.md` | voz medida e descrita, com exemplos do próprio projeto |
| `escrita/projetos/<slug>/editorial/style/cliches-extra.txt` | clichés específicos do projeto ou do género |
| `escrita/projetos/<slug>/editorial/style/cliches-allow.txt` | clichés usados deliberadamente (reportados como "deliberado") |
| `scripts/data/cliches-<língua>.txt` | lista base por língua (escolhida por `language` no PROJECT.md) |

## Medir a voz

```bash
node scripts/cwos.mjs style                      # todo o manuscrito
node scripts/cwos.mjs style escrita/projetos/x/manuscript/scenes/sc-01.md
```

| métrica | lê-se como |
|---|---|
| `media_frase` / `desvio_frase` | comprimento e variação das frases (um desvio baixo significa monotonia) |
| `frases_curtas_pct` / `frases_longas_pct` | abaixo de 8 palavras / acima de 30 |
| `media_paragrafo` | densidade visual |
| `dialogo_pct` | parágrafos que começam por travessão ou aspas |
| `adverbios_mente_por_1000` | pista de verbos fracos |
| `ttr` | variedade lexical (type/token, %). Só é comparável entre textos de tamanho semelhante |
| `repetidas` | palavras de 5 ou mais letras que aparecem 3 ou mais vezes (pista, não erro) |

As métricas são **pistas**. O ritmo certo é o do projeto e não um valor universal.

## Autores de referência

- As referências entram no brief e no style guide como **características abstratas** (skill `literary-analysis`).
- Não se imita a voz de autores vivos nem se copiam passagens.
- Autores do domínio público podem ser pastichados se o autor o pedir explicitamente.

## Convenções pt-PT por omissão

- Diálogo com travessão (—) em parágrafo próprio; as intervenções do narrador também levam travessão.
- Aspas angulares « » para citações; aspas curvas “ ” dentro de « ».
- Reticências como carácter único (…).
- Acordo Ortográfico de 1990, salvo decisão contrária no `PROJECT.md`.
- Ênclise por omissão ("disse-lhe"); próclise nos contextos obrigatórios ("não lhe disse").

## Clichés

O `cwos cliches` encontra expressões da lista, e a leitura crítica encontra o resto (tropos, arquétipos, coincidências). A regra é **perguntar se o uso é deliberado**:

- Se for deliberado, acrescenta-se a `cliches-allow.txt` e avalia-se a execução.
- Se não for, trata-se como P3 (linguagem) ou P1/P2 (tropo narrativo), com opções.
