# Design — Plano de desenvolvimento do Copiloto de Transição 6x1

## Objetivo e premissas

Planejar o desenvolvimento, por uma pessoa desenvolvedora, de uma primeira versão utilizável em até 30 dias corridos, seguida das capacidades restantes do PRD em fases incrementais. O projeto é greenfield: no momento há somente o PRD, sem aplicação, testes ou infraestrutura de desenvolvimento.

O primeiro release entrega premissas preenchidas manualmente, diagnóstico, simulador de cenários e consulta à linha do tempo/checklist de prazos. Ficam para fases posteriores o gerador automático de escala, CSV, persistência local e documentos exportáveis. Não haverá cadastro, transmissão de dados operacionais, API de produto, analytics, integrações externas ou banco de dados. A primeira entrega mantém os dados apenas no estado da sessão do navegador.

## Arquitetura

Usar Next.js com TypeScript, inicialmente configurado para publicar uma aplicação estática na Vercel. O código que calcula datas, custos, déficits e cenários fica em módulos de domínio puros, separados dos componentes de interface e utilizáveis no navegador. As premissas do primeiro release ficam somente no estado da interface; nenhuma rota de API ou lógica de servidor recebe dados operacionais. Parâmetros legais versionados ficam no código-fonte e entram em vigor com uma nova publicação.

Separar a aplicação em: configuração versionada de parâmetros legais; domínio de datas e etapas; aritmética monetária decimal/racional exata; diagnóstico; simulador; fluxo de interface para premissas, resultados e comparação; infraestrutura de publicação e testes. O gerador de escalas será investigado como unidade própria numa fase posterior, sem fixar solver antes de um protótipo e benchmark.

## Plano de releases e marcos

### Release inicial — até 30 dias

1. **Gate jurídico e preparação:** confirmar a promulgação e o texto legal publicado; obter validação das interpretações que afetam regras e divisor; definir premissas explícitas. Dúvida jurídica material sobre qualquer cálculo incluído bloqueia sua publicação; se afetar o fluxo essencial do MVP, bloqueia o release.
2. **Fundação:** iniciar Next.js/TypeScript, convenções e testes; implementar parâmetros legais versionados, fuso/data e aritmética monetária exata; automatizar os cenários correspondentes.
3. **Diagnóstico e linha do tempo:** criar formulário de premissas manuais, validação acessível, resultados por etapa e consulta a prazos/checklist; cobrir cálculos de jornada, custo-hora, déficit e datas.
4. **Simulador:** comparar os cenários previstos no PRD, identificar inviabilidades e recomendar apenas opção válida; testar casos de borda e resultados monetários.
5. **Qualidade e publicação:** verificar ausência de transmissão de valores, validar fluxo responsivo em 390 × 844 e 1440 × 900, revisar acessibilidade básica, publicar preview/staging e liberar a aplicação estática na Vercel.

### Fase seguinte — persistência, importação e documentos locais

Adicionar persistência local somente após escolher o mecanismo, definir comportamento entre sessão e reload, implementar exclusão integral e testar que dados apagados não retornam. Em uma entrega separada, adicionar CSV lido no navegador, validando colunas e descartando dados não necessários, além de geração local dos modelos e documentos PDF/imagem previstos no PRD. As estimativas são intervalos sujeitos ao resultado dos protótipos.

### Fase posterior — gerador de escala

Antes da implementação, prototipar e comparar estratégias de geração/otimização em dados sintéticos, sem dados reais; validar as regras legais, viabilidade e tempo de até 10 segundos para 50 pessoas. Escolher a solução com base em correção, desempenho no navegador e simplicidade. Implementar edição e revalidação da escala como etapas separadas, seguidas de exportação integrada.

## Qualidade e tratamento de falhas

Usar testes unitários para o domínio e regras, testes de componentes para formulários e resultados e testes end-to-end no navegador para os fluxos principais. Observar requisições de rede nos testes de privacidade, distinguindo assets estáticos/metadados técnicos permitidos de qualquer transmissão de dados operacionais. Executar os cenários legalmente aplicáveis no CI em cada pull request e manter testes dos viewports, dos limites de performance e da exclusão local à medida que essas funcionalidades forem entregues.

Entradas inválidas devem receber mensagens acionáveis sem persistência ou envio de conteúdo. Cenários matematicamente inválidos ou legais inviáveis mostram a causa e não recebem recomendação. Falhas em CSV, armazenamento, geração ou exportação, quando introduzidos, devem ser visíveis e não resultar em mensagens de sucesso falsas. Se a build, os testes críticos de privacidade, a validação jurídica dos cálculos incluídos ou as metas essenciais de cálculo falharem, a publicação é bloqueada.

## Riscos e decisões de fase

- **Prazo apertado para uma pessoa:** proteger a entrega em 30 dias reduzindo o primeiro release às premissas manuais, diagnóstico, simulador e consulta à linha do tempo/checklist.
- **Interpretação legal e prazo:** validar fontes e premissas antes de codificar regras como fatos; tratar revisão jurídica não concluída como bloqueio.
- **Precisão monetária:** definir e testar representação decimal/racional exata antes dos cenários de custo.
- **Privacidade da hospedagem:** confirmar a configuração de publicação estática e demonstrar em teste que nenhum dado operacional vai para APIs ou origens externas.
- **Escalonamento de regras:** adiar gerador e persistência até que protótipos e testes reduzam os riscos de desempenho e exclusão incompleta.
