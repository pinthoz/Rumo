# Manual de utilização do Rumo

Este manual foi escrito para quem quer usar o Rumo sem perceber de programação. A instalação exige alguns passos técnicos uma única vez; depois disso, a utilização diária faz-se pelo painel no navegador e por comandos simples no Claude Code.

## 1. O que é o Rumo

O Rumo é um assistente pessoal organizado em seis áreas:

| área | para que serve |
|---|---|
| **Rotina** | organizar o dia, escolher até três prioridades, registar tarefas, criar hábitos e fazer a revisão semanal |
| **Finanças** | importar extratos, categorizar despesas, acompanhar o orçamento, despesas recorrentes e património |
| **Carreira** | definir o que se procura, encontrar e avaliar vagas, acompanhar candidaturas e contactos de seguimento |
| **Pensar** | discutir uma ideia com pesquisa, perguntas e análise crítica |
| **Língua** | corrigir português europeu e inglês, mantendo um glossário e aprendendo com erros recorrentes |
| **Escrita** | rever textos sem apagar a voz do autor e gerir projetos longos, como livros ou séries |

Há duas formas principais de o usar:

1. **Painel local:** uma interface visual no navegador para tarefas, finanças, carreira e configuração dos documentos pessoais.
2. **Claude Code:** a conversa com o assistente, onde se usam comandos como `/hoje`, `/financas` ou `/candidaturas`.

O painel continua a funcionar enquanto a janela preta com o título **Rumo local** estiver aberta.

## 2. O que fica realmente local

Os documentos pessoais do Rumo ficam dentro da pasta do Rumo no computador. Não são colocados no Git e não são enviados automaticamente para Drive, Dropbox, Notion ou outros serviços.

Há, no entanto, uma distinção importante:

- **Guardar um ficheiro ou usar o painel local** mantém esse ficheiro no computador.
- **Pedir algo ao Claude Code** envia para o serviço Claude o texto necessário para processar esse pedido. O modelo não funciona sem Internet nem inteiramente dentro do computador.
- **Ligar o Gmail ao Claude** permite que o serviço Claude consulte mensagens quando for pedido. Os dados recuperados ficam associados à conversa nos servidores da Anthropic; podem ser removidos apagando essa conversa. O Rumo guarda localmente apenas as tarefas que a pessoa confirmar, nunca o corpo completo do email.
- Os comandos `/rumo` e `/sincronizar` publicam ou sincronizam dados com a conta Claude. Quem quiser uma utilização estritamente local não deve usar esses dois comandos.
- Guardar a pasta dentro de OneDrive, Dropbox ou outra pasta sincronizada faz com que esses serviços possam copiar os ficheiros. Para uma utilização estritamente local, guardar a pasta fora dessas localizações.

O painel local só aceita editar uma lista fechada de documentos pessoais. Não dá acesso livre ao resto do computador e a ligação só escuta no próprio computador (`127.0.0.1`).

## 3. O que é necessário instalar

### Obrigatório

- Um computador com Windows 10 ou superior, macOS 13 ou superior, ou uma distribuição Linux suportada.
- **Node.js 18 ou superior.** Recomenda-se uma versão LTS atualmente suportada.
- Uma cópia completa da pasta do Rumo.
- Um navegador moderno, como Edge, Chrome, Firefox ou Safari.

### Necessário para conversar com o assistente

- Ligação à Internet.
- **Claude Code**.
- Uma conta Claude Pro, Max, Team ou Enterprise, ou uma conta Anthropic Console com faturação ativa. A conta gratuita do claude.ai não inclui o Claude Code.

O Git for Windows é opcional nas versões atuais do Claude Code. Pode ser útil para manutenção do projeto, mas não é necessário para abrir o painel local.

O Rumo não tem bibliotecas adicionais para instalar. Depois de instalar o Node.js, não é necessário executar `npm install`.

## 4. Instalação no Windows

Este é o percurso recomendado para a pessoa que vai usar o Rumo.

### Passo 1 — Preparar a conta Claude

1. Entrar em [claude.ai](https://claude.ai/).
2. Confirmar que a conta tem um plano compatível com Claude Code: Pro, Max, Team ou Enterprise. Também é possível usar uma conta Anthropic Console com faturação ativa.
3. Guardar os dados de início de sessão. A autenticação será feita no navegador durante a primeira abertura do Claude Code.

### Passo 2 — Instalar o Node.js

1. Abrir a página oficial de [transferências do Node.js](https://nodejs.org/en/download/).
2. Escolher a versão marcada **LTS**, não sendo necessário escolher a versão “Current”.
3. Descarregar o instalador para Windows e aceitar as opções normais do instalador.
4. Reiniciar o computador, ou pelo menos fechar e voltar a abrir as janelas do terminal.

Para confirmar a instalação:

1. Abrir o menu Iniciar.
2. Escrever `PowerShell` e abrir **Windows PowerShell** ou **Terminal**.
3. Executar:

```powershell
node --version
```

Deve aparecer algo semelhante a `v22.x.x` ou `v24.x.x`. Qualquer versão igual ou superior a 18 é aceite pelo Rumo, embora seja preferível usar uma versão LTS ainda suportada.

### Passo 3 — Instalar o Claude Code

No PowerShell, executar o instalador oficial:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Não é necessário abrir o PowerShell como administrador. Em alternativa, quem preferir pode instalar com o Gestor de Pacotes do Windows:

```powershell
winget install Anthropic.ClaudeCode
```

Confirmar a instalação:

```powershell
claude --version
claude doctor
```

O primeiro comando deve mostrar a versão. O segundo faz um diagnóstico sem alterar os ficheiros.

As instruções de instalação podem mudar. Em caso de diferença, seguir a [documentação oficial do Claude Code](https://code.claude.com/docs/en/getting-started).

### Passo 4 — Colocar a pasta do Rumo no computador

Se o Rumo tiver sido recebido num ficheiro ZIP:

1. Clicar no ZIP com o botão direito.
2. Escolher **Extrair tudo**.
3. Mover a pasta extraída para uma localização fácil de encontrar.

Para manter os dados apenas no computador, evitar pastas com nomes como `OneDrive`, `Dropbox`, `Google Drive` ou semelhantes. Um exemplo de localização é:

```text
C:\Users\nome-da-pessoa\Rumo
```

Não retirar ficheiros individuais da pasta. O Rumo depende da estrutura completa de subpastas.

### Passo 5 — Abrir o Claude Code pela primeira vez

1. Abrir a pasta do Rumo no Explorador de Ficheiros.
2. Clicar na barra onde aparece o caminho da pasta.
3. Escrever `powershell` e carregar em Enter.
4. Na janela aberta, executar:

```powershell
claude
```

5. Seguir as instruções no navegador para entrar na conta Claude.
6. Se o Claude pedir autorização para trabalhar nesta pasta, confirmar apenas depois de verificar que o caminho apresentado é o da pasta do Rumo.

Quando aparecer a caixa de conversa, escrever:

```text
/hoje
```

Se o comando for reconhecido, a instalação principal está concluída.

## 5. Instalação no macOS ou Linux

Instalar primeiro uma versão LTS do [Node.js](https://nodejs.org/en/download/). Depois, instalar o Claude Code seguindo a [documentação oficial](https://code.claude.com/docs/en/getting-started).

No macOS ou Linux, o instalador nativo indicado pela Anthropic é:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Confirmar com:

```bash
node --version
claude --version
claude doctor
```

Para abrir o painel, entrar na pasta do Rumo no terminal e executar:

```bash
npm run painel
```

Para abrir o Claude Code nessa pasta:

```bash
claude
```

## 6. Primeira configuração do Rumo

Reservar cerca de 30 minutos. Não é necessário preencher tudo de uma vez.

### Abrir o painel local

No Windows, fazer duplo clique em [Abrir Rumo.cmd](<../Abrir Rumo.cmd>). O navegador abre automaticamente no endereço local do Rumo.

É normal aparecer uma janela preta. Essa janela mantém o painel ligado:

- pode ser minimizada;
- não deve ser fechada enquanto se usa o painel;
- ao fechá-la, o painel deixa de conseguir ler e guardar ficheiros;
- para voltar a usar, basta fazer novamente duplo clique em `Abrir Rumo.cmd`.

Não guardar o endereço com o código `?local=...` nos favoritos nem o partilhar. Esse código é temporário. Abrir sempre pelo atalho.

### Preencher os documentos pessoais

No painel, abrir **Configurar**. Os documentos disponíveis são:

| documento | o que preencher |
|---|---|
| **A minha rotina** | horários fixos, melhores horas para concentração, até dois hábitos e momento de revisão semanal |
| **O que procuro** | cargos, senioridade, locais, modelo de trabalho, salário, limites e ritmo da procura de emprego |
| **O meu CV** | resumo, experiência real, projetos, formação e competências; não acrescentar experiência que não exista |
| **Objetivos financeiros** | situação atual, dívidas, fundo de emergência, objetivos, prazos e tolerância a perdas |
| **O meu glossário** | termos e traduções que devem ser usados sempre da mesma forma |
| **Erros frequentes** | erros aceites pela pessoa e respetiva correção |
| **A minha voz** | características confirmadas da escrita; é melhor construir este documento com o comando `/rever` a partir de textos reais |

Escolher um documento, preencher os campos e carregar em **Guardar no computador**. Na primeira gravação é criado o ficheiro pessoal. Nas gravações seguintes, a versão anterior é copiada para `.sync/backups/config/`.

### Configuração inicial na conversa

Abrir o Claude Code na pasta do Rumo e fazer, por esta ordem:

1. `/hoje` — responder às perguntas sobre rotina e escolher as prioridades.
2. `/lembretes` — escolher horários e testar uma notificação.
3. `/gastos` — importar um primeiro extrato bancário, se for usar Finanças.
4. `/financas` — definir orçamento e objetivos sem inventar valores.
5. `/candidaturas` — rever o próximo passo profissional.
6. `/pt profissional <um pequeno texto>` — testar a correção de português.
7. `/rever <texto ou ficheiro> tom` — começar a construir o perfil de escrita. O ideal são três a cinco textos escritos pela própria pessoa.

## 7. Utilização diária

### Abrir o Rumo

Para a interface visual:

1. Fazer duplo clique em `Abrir Rumo.cmd`.
2. Manter a janela preta aberta.
3. Usar o painel no navegador.
4. Fechar a janela preta quando terminar.

Para conversar com o assistente:

1. Abrir um PowerShell dentro da pasta do Rumo.
2. Executar `claude`.
3. Usar um dos comandos deste manual.

### Rotina recomendada de cinco minutos

| momento | ação |
|---|---|
| início do dia | `/hoje` para ver até três prioridades e o primeiro passo de cada uma |
| ao começar | `/foco` para escolher uma tarefa e iniciar um bloco com temporizador |
| quando surge outra ideia | `/captura comprar pilhas` para a guardar sem abandonar o que se estava a fazer |
| quando uma tarefa bloqueia | `/travado IRS` para a reduzir a um primeiro passo possível |
| fim do dia | `/feito` para marcar o que terminou e decidir o que acontece ao resto |

### Uma área por conversa

Para evitar que o Claude misture tarefas, finanças, carreira e escrita:

- começar a conversa pelo comando da área;
- abrir uma conversa nova quando se muda de assunto;
- usar `/clear` antes de começar outra área na mesma janela;
- perguntar “de onde vem esse valor?” sempre que aparecer um número ou facto importante.

## 8. Painel local: o que cada parte guarda

O painel apresenta atalhos para tarefas, orçamento, património, candidaturas, correções e escrita.

Existem dois tipos de dados:

1. **Documentos da área Configurar.** São guardados como ficheiros `.md` dentro da pasta do Rumo.
2. **Listas e registos operacionais do painel.** São guardados pelo navegador no endereço local do Rumo.

Por isso:

- usar sempre o mesmo navegador e o atalho `Abrir Rumo.cmd`;
- não limpar os dados desse site no navegador sem antes exportar o que for importante;
- não usar uma janela privada/anónima para dados que se querem conservar;
- os dados de um navegador não aparecem automaticamente noutro;
- os dados do painel não substituem uma cópia de segurança dos ficheiros.

Na área Tarefas, os botões **Descarregar tarefas.md** e **Importar tarefas.md** permitem fazer uma transferência manual. A importação substitui a lista presente na página, por isso deve ser confirmada com atenção.

## 9. Rotina e tarefas

### Comandos principais

| comando | resultado |
|---|---|
| `/hoje` | mostra atrasos, prazos e até três prioridades |
| `/foco` | escolhe uma tarefa e inicia um temporizador |
| `/foco IRS 10` | inicia dez minutos de foco na tarefa IRS |
| `/captura telefonar à Joana` | coloca rapidamente uma tarefa na caixa de entrada |
| `/travado relatório` | ajuda a encontrar um passo muito pequeno para começar |
| `/feito telefonar` | marca a tarefa correspondente como concluída |
| `/feito` | conduz o fecho do dia |
| `/semana` | faz a revisão dos últimos sete dias e escolhe prioridades para a semana seguinte |
| `/lembretes` | instala, testa, consulta ou remove notificações automáticas |

### Ligar o Gmail ao `/hoje` — opcional

Esta integração usa o conector oficial do Gmail na conta Claude. Não é necessário criar um projeto Google nem guardar chaves no Rumo.

1. Entrar em [claude.ai](https://claude.ai/) com a mesma conta usada no Claude Code.
2. Abrir **Personalizar / Customize → Conectores / Connectors** ou ir a [claude.ai/customize/connectors](https://claude.ai/customize/connectors).
3. Escolher **Gmail**, carregar em **Ligar / Connect** e autenticar-se diretamente na conta Google.
4. Rever as permissões apresentadas. Quando os controlos estiverem disponíveis, deixar leitura autorizada e manter envio, resposta, reencaminhamento e eliminação como **Pedir aprovação** ou **Bloqueado**.
5. Fechar e voltar a abrir o Claude Code na pasta do Rumo.
6. Executar `/mcp` e confirmar que aparece o conector `claude.ai Gmail` como ligado.
7. Executar `/hoje`.

O `/hoje` procura até dez emails não lidos dos últimos sete dias e guarda no máximo três que tenham uma ação concreta. Publicidade, newsletters, redes sociais e notificações automáticas ficam de fora sempre que a pesquisa as conseguir distinguir.

Para cada email, mostra apenas o remetente, assunto, data, ação provável, prazo explícito e ligação para o Gmail. O email só entra na caixa de entrada do Rumo depois de confirmação. É guardada uma tarefa curta com a ligação; o corpo da mensagem não é copiado para `tarefas.md`.

No painel local, abrir **Hoje → Caixa de entrada**. Aparece um email de cada vez:

- usar **←** e **→** para passar entre mensagens;
- o contador mostra a posição, por exemplo `1 de 3`;
- **Abrir no Gmail** abre a mensagem original;
- **Passar para tarefas** cria uma tarefa curta na caixa de entrada;
- **Atualizar** volta a ler a lista deixada pelo último `/hoje`.

Se o painel já estava aberto quando se executou `/hoje`, carregar em **Atualizar**. O ficheiro local `rotina/emails.json` contém apenas estes metadados e fica fora do Git.

O `/hoje` nunca envia, responde, reencaminha, arquiva, etiqueta, apaga ou marca emails como lidos. O conteúdo dos emails é tratado como não confiável: instruções escritas dentro de uma mensagem são ignoradas. Para fazer o plano sem consultar o Gmail, usar:

```text
/hoje sem email
```

Se o conector não aparecer em `/mcp`, confirmar com `/status` que o Claude Code está autenticado através da conta claude.ai, e não através de uma chave de API. Depois, repetir `/login` e reiniciar o Claude Code. Em contas Team ou Enterprise, um administrador pode ter de autorizar o conector primeiro.

### Tarefas recorrentes

Uma tarefa pode repetir-se automaticamente. Exemplos:

```text
Pagar renda ^2026-10-08 *mensal
Rever agenda ^2026-09-21 *semanal
```

Ao marcar uma tarefa recorrente como feita, o Rumo cria a ocorrência seguinte. As repetições disponíveis são diária, semanal, mensal e anual.

### Lembretes automáticos

Por omissão, podem ser instalados:

- manhã, às 09:00: prioridades do dia;
- prazo, às 15:00: apenas se houver um prazo do dia por cumprir;
- tarde, às 18:30: fecho do dia;
- domingo, às 17:00: revisão semanal.

O comando `/lembretes` pergunta pelos horários, mostra primeiro o plano e só instala depois de confirmação. No Windows usa o Agendador de Tarefas; no macOS usa `launchd`. O computador tem de estar ligado para a notificação aparecer.

## 10. Finanças

### Primeira utilização

1. No homebanking, exportar um extrato em formato CSV.
2. Guardar o ficheiro temporariamente numa pasta fácil de encontrar.
3. No Claude Code, executar `/gastos` e indicar o caminho do CSV.
4. Confirmar as colunas detetadas e a conta a que pertence.
5. Rever movimentos sem categoria.
6. Executar `/financas` para ver o resumo do mês.

O importador evita duplicados e reconhece formatos comuns portugueses, incluindo vírgula decimal. Alguns bancos usam cabeçalhos diferentes; nesse caso, o assistente pode pedir a correspondência das colunas.

No painel local, o separador **Mês** concentra o trabalho diário:

- os quatro cartões mostram o valor disponível no orçamento, receitas, despesas e saldo do mês;
- a caixa seguinte indica a próxima ação útil, por exemplo importar o primeiro extrato, categorizar movimentos ou rever um limite ultrapassado;
- **Registar movimento** serve para uma entrada pontual e **Importar extrato** para um CSV do banco;
- **Rever sem categoria** mostra apenas os movimentos que ainda precisam de decisão;
- a pesquisa dos movimentos aceita descrição, categoria ou nome da conta;
- os limites do orçamento são editados diretamente junto de cada categoria.

Em **Património**, os cartões separam património líquido, dinheiro disponível, investimentos e dívidas. O nome, tipo e saldo de cada conta podem ser atualizados diretamente; saldos com mais de 35 dias ficam assinalados.

Quando o painel é aberto por `Abrir Rumo.cmd`, todas as alterações feitas nestes dois separadores são gravadas automaticamente nos ficheiros `financas/`: movimentos por mês, orçamento, regras, contas e objetivos. A versão anterior de cada ficheiro alterado fica em `.sync/backups/financas/`. O armazenamento do navegador funciona apenas como cópia temporária e mecanismo de migração; os ficheiros locais são a fonte principal.

### Comandos principais

| comando | resultado |
|---|---|
| `/gastos` | importa um extrato, regista ou categoriza despesas |
| `/financas` | resume receitas, despesas, poupança, orçamento e património |
| `/financas 2026-09` | mostra um mês específico |
| `/investir PPR ou certificados de aforro?` | explica e compara opções com fontes atuais, sem decidir pela pessoa |

Atualizar mensalmente os saldos das contas para manter o património correto. Confirmar sempre impostos, taxas e decisões relevantes junto de fontes oficiais ou de um profissional certificado.

Os extratos têm dados sensíveis. Depois de confirmar a importação e a cópia de segurança, apagar as cópias desnecessárias da pasta Transferências.

## 11. Carreira

Antes de avaliar vagas, preencher **O meu CV** e **O que procuro** em Configurar. Sem esses documentos, uma comparação séria seria impossível.

### Workflow recomendado

1. **Definir critérios:** cargos, localização, salário, modelo de trabalho, obrigatórios e exclusões.
2. **Procurar:** `/procurar machine learning lisboa`.
3. **Rever novidades:** olhar primeiro para as vagas mais próximas do perfil.
4. **Avaliar:** `/vaga <link ou texto>` compara cada requisito com o CV.
5. **Guardar:** manter apenas as vagas que merecem uma ação.
6. **Candidatar:** atualizar com uma frase normal, por exemplo “candidatei-me à Empresa X”.
7. **Acompanhar:** `/candidaturas` mostra uma única próxima ação e contactos em atraso.
8. **Rever resultados:** `/candidaturas resumo` mostra o pipeline e a taxa de resposta.

### Comandos principais

| comando | resultado |
|---|---|
| `/procurar data scientist remoto` | procura vagas com essas palavras e localização |
| `/vaga <link>` | avalia a vaga requisito a requisito contra o CV e o perfil |
| `/candidaturas` | mostra a próxima ação mais útil |
| `/candidaturas lista` | mostra candidaturas em curso |
| `/candidaturas resumo` | mostra contagens, respostas e seguimentos pendentes |
| `/candidaturas procura diária` | prepara uma pesquisa diária automática nas fontes com API |

Os estados são: guardada, candidatei, entrevista, proposta, aceite, recusada, sem resposta e desisti. Ao mudar para “candidatei”, o Rumo propõe um contacto sete dias depois; depois de entrevista, três dias depois.

### Fontes e ITJobs

A procura automática usa apenas fontes com acesso público adequado. O LinkedIn só é pesquisado a pedido: o Rumo pode importar os resultados visíveis na pesquisa pública, sem entrar na conta. No painel, **Pesquisar no LinkedIn (minha sessão)** abre os mesmos termos e filtros no navegador; se a pessoa já tiver sessão iniciada, pode consultar aí todos os detalhes, mas o Rumo não lê cookies nem automatiza a conta.

O ITJobs.pt é opcional e exige uma chave pedida em [itjobs.pt/api](https://www.itjobs.pt/api). No Windows, guardar a chave fora do projeto:

```powershell
setx ITJOBS_API_KEY "a-tua-chave"
```

Fechar e voltar a abrir o Claude Code depois deste comando. Nunca escrever a chave em `.claude/settings.json`, nos documentos pessoais ou numa conversa.

## 12. Pensar, Língua e Escrita

### Pensar

Usar `/pensar <ideia>` para examinar pressupostos, procurar evidência e encontrar objeções. Exemplo:

```text
/pensar trabalhar sempre a partir de casa baixa a produtividade
```

Factos atuais devem vir acompanhados por fonte e data. Uma opinião do assistente deve ser apresentada como opinião, não como facto.

### Língua

| comando | exemplo |
|---|---|
| `/pt` | `/pt profissional Segue em anexo os documentos` |
| `/en` | `/en profissional uk Please find attached my CV` |

É possível indicar tom pessoal ou profissional e, em inglês, variante britânica (`uk`) ou americana (`us`). O glossário regista escolhas consistentes; os erros frequentes só devem ser acrescentados quando a pessoa aceita a correção.

### Textos soltos

Usar `/rever` para analisar sem reescrever automaticamente:

```text
/rever cronica.md coerência
/rever cronica.md tom
/rever desbloquear uma história sobre uma farmácia
```

### Obras longas

Para um romance, série ou universo, começar por:

```text
/project new meu-livro --profile long --title "O meu livro"
/brief
```

O fluxo completo passa por brief, arquitetura, personagens, mundo, outline, cenas, pesquisa, rascunho, crítica, edição, continuidade, factos, voz, polimento e controlo final. O autor aprova as alterações antes de se tornarem canon. O guia técnico desta área está em [escrita/docs/workflow.md](../escrita/docs/workflow.md).

## 13. Painel na conta Claude e sincronização — opcional

Esta secção só interessa a quem quer usar o painel fora do computador, por exemplo no telemóvel.

1. `/rumo` publica uma cópia privada na conta Claude da pessoa.
2. `/sincronizar simular` mostra o que seria alterado sem gravar.
3. `/sincronizar` junta tarefas, finanças e candidaturas nos dois sentidos.

As vagas encontradas pelo computador seguem para a página; a página não faz pesquisa automática na Internet. Quando a mesma tarefa muda nos dois lados, o relatório apresenta o conflito e uma tarefa concluída não volta a ficar por fazer.

**Para manter tudo apenas no computador, não usar `/rumo` nem `/sincronizar`.** O painel local continua disponível através de `Abrir Rumo.cmd`.

## 14. Onde ficam os dados

| conteúdo | localização aproximada |
|---|---|
| tarefas e rotina | `rotina/` |
| movimentos, regras, orçamento, contas e objetivos | `financas/` |
| CV, perfil, vagas e candidaturas | `carreira/` |
| glossário e erros aceites | `lingua/` |
| perfil da voz e projetos | `escrita/` |
| cópias automáticas da área Configurar | `.sync/backups/config/` |
| endereço opcional do painel na conta Claude | `config/rumo.json` |

Os ficheiros pessoais não são controlados pelo Git. Isto protege a privacidade, mas significa também que o Git não serve de cópia de segurança desses dados.

## 15. Cópias de segurança

Fazer uma cópia periódica da pasta inteira do Rumo:

1. Fechar o Claude Code e a janela **Rumo local**.
2. Copiar a pasta completa para um disco externo ou para outra localização controlada.
3. Dar à cópia um nome com data, por exemplo `Rumo-backup-2026-09-17`.
4. Confirmar que a cópia contém as pastas `rotina`, `financas`, `carreira`, `lingua` e `escrita`.

Se o objetivo for manter os dados fora da nuvem, não usar uma pasta de cópia sincronizada. Um disco externo cifrado é preferível para dados financeiros ou profissionais.

As cópias automáticas em `.sync/backups/config/` protegem apenas os sete documentos editados em Configurar. Não substituem a cópia da pasta inteira.

## 16. Resolução de problemas

### `Abrir Rumo.cmd` diz que o Node.js não está instalado

Abrir PowerShell e executar `node --version`. Se o comando não existir:

1. instalar novamente a versão LTS do Node.js;
2. aceitar as opções normais do instalador;
3. reiniciar o computador.

### O painel não abre

- Verificar se a janela preta continua aberta.
- Procurar nessa janela uma mensagem de erro.
- Confirmar que nenhum outro Rumo local já está aberto.
- Se aparecer que a porta `43117` já está a ser usada, voltar ao separador do Rumo que já estava aberto ou fechar a janela antiga antes de tentar novamente.
- Experimentar escrever `http://127.0.0.1:43117/` no navegador apenas se o painel já estiver em execução; para editar ficheiros é necessário o endereço completo aberto pelo atalho.

### A área Configurar diz que está desligada

O ficheiro `prototipo/rumo.html` foi provavelmente aberto diretamente. Fechar esse separador e abrir através de `Abrir Rumo.cmd` ou `npm run painel`.

### Os dados do painel desapareceram

- Confirmar que está a ser usado o mesmo navegador e o mesmo perfil de navegador.
- Não usar navegação privada.
- Confirmar que o navegador não foi configurado para apagar dados dos sites ao fechar.
- Para tarefas, procurar uma exportação recente de `tarefas.md`.
- Os documentos da área Configurar continuam nos ficheiros da pasta e não dependem do armazenamento do navegador.

### `claude` não é reconhecido

Executar novamente o instalador oficial e depois fechar e reabrir o PowerShell. Confirmar com:

```powershell
claude --version
claude doctor
```

### Os comandos `/hoje` ou `/financas` não aparecem

O Claude Code foi provavelmente aberto noutra pasta. Sair e voltar a executar `claude` a partir da raiz do Rumo, a pasta que contém `CLAUDE.md`, `Abrir Rumo.cmd` e `package.json`.

### A notificação não aparece

1. Executar `/lembretes testar`.
2. Confirmar que as notificações do terminal estão autorizadas no sistema operativo.
3. Executar `/lembretes estado`.
4. Recordar que o computador tem de estar ligado na hora definida.

### Um extrato bancário não é reconhecido

Não alterar o ficheiro original. Dizer ao assistente quais são as colunas de data, descrição, débito, crédito ou montante. Se necessário, usar uma cópia sem linhas introdutórias do banco.

### O Claude apresenta informação inventada ou mistura assuntos

- perguntar “qual é a fonte e a data?”;
- abrir uma conversa nova para a área correta;
- dizer explicitamente “não uses informação de outras áreas”;
- não aceitar alterações a valores, CV ou textos pessoais sem as rever.

## 17. Atualização e manutenção

O instalador nativo do Claude Code atualiza-se automaticamente. Para forçar uma atualização numa instalação nativa:

```powershell
claude update
```

Se o Claude Code tiver sido instalado com WinGet, atualizar com:

```powershell
winget upgrade Anthropic.ClaudeCode
```

De tempos a tempos, confirmar o estado com:

```powershell
claude doctor
node --version
```

Quem fizer manutenção técnica ao Rumo pode executar, na pasta do projeto:

```powershell
npm test
```

Este comando verifica os scripts e a estrutura. Não é necessário na utilização diária.

## 18. Referência rápida

| quero… | usar… |
|---|---|
| abrir a interface visual | duplo clique em `Abrir Rumo.cmd` |
| alterar rotina, CV ou preferências | **Configurar** no painel |
| organizar o dia | `/hoje` |
| começar sem pensar demasiado | `/foco` |
| guardar uma ideia rapidamente | `/captura <texto>` |
| desbloquear uma tarefa | `/travado <tarefa>` |
| fechar o dia | `/feito` |
| rever a semana | `/semana` |
| configurar notificações | `/lembretes` |
| importar despesas | `/gastos` |
| ver o mês financeiro | `/financas` |
| compreender um investimento | `/investir <pergunta>` |
| procurar emprego | `/procurar <palavras e local>` |
| avaliar uma vaga | `/vaga <link ou texto>` |
| saber o próximo passo profissional | `/candidaturas` |
| discutir uma ideia | `/pensar <ideia>` |
| corrigir português | `/pt <texto>` |
| corrigir inglês | `/en <texto>` |
| rever escrita própria | `/rever <texto ou ficheiro>` |
| publicar o painel na conta Claude | `/rumo` — opcional, deixa de ser estritamente local |
| sincronizar computador e conta Claude | `/sincronizar` — opcional, deixa de ser estritamente local |

## 19. Regras de segurança simples

1. Não partilhar chaves de API, palavras-passe ou o endereço temporário do painel.
2. Não colocar ficheiros pessoais em ficheiros com `.modelo.` no nome.
3. Rever antes de aceitar alterações ao CV, valores financeiros ou candidaturas.
4. Fazer cópias de segurança regulares da pasta inteira.
5. Fechar a janela do painel quando terminar.
6. Não usar `/rumo` ou `/sincronizar` quando a exigência for manter tudo apenas no computador.
7. Em finanças, impostos, saúde ou decisões legais, usar o Rumo para organizar e compreender — não como substituto de um profissional certificado.
