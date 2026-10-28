# Plano de Desenvolvimento — Copiloto de Transição 6x1

> **Para agentes de implementação:** SUBSKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Use caixas de seleção (`- [ ]`) para acompanhar as etapas.

**Objetivo:** Desenvolver uma aplicação Next.js gratuita e com privacidade local, lançando em até 30 dias corridos o diagnóstico com premissas manuais, a linha do tempo/checklist legal e o simulador de cenários; adicionar depois persistência local, CSV, exportações e geração de escalas.

**Arquitetura:** Publicar na Vercel uma aplicação Next.js/TypeScript gerada estaticamente. Manter todos os cálculos em módulos de domínio puros e compatíveis com o navegador, sem API de produto nem dados operacionais no servidor; incluir persistência no navegador e gerador de escalas somente em versões posteriores, após validar privacidade e desempenho.

**Tecnologias:** Next.js, TypeScript, npm, Vitest, React Testing Library, Playwright, hospedagem estática na Vercel e aritmética monetária exata em base 10/racionais.

## Restrições globais

- A primeira versão entrega premissas inseridas manualmente, diagnóstico, simulador de cenários e linha do tempo/checklist legal em até 30 dias corridos.
- Não haverá contas, API de produto, processamento de dados operacionais no servidor, analytics, integração com terceiros nem banco de dados.
- Na primeira versão, os dados ficam somente no estado da sessão do navegador; persistência local será adiada para uma versão posterior e deverá incluir exclusão completa e explícita.
- Os parâmetros legais são versionados no código-fonte e entram em vigor por meio de uma versão publicada da aplicação; separar status `provisório` de `aprovado` e não selecionar/publicar parâmetros reais como aprovados até publicação final no DOU e fechamento dos gates aplicáveis, inclusive GJ-04.
- As operações monetárias usam aritmética exata em base 10/racional; arredondamento half-even para duas casas decimais somente nos valores finais exibidos.
- Testes automatizados cobrem cada regra de negócio aplicável e a fronteira de privacidade; o fluxo principal é testado em 390 × 844 px e 1440 × 900 px.
- A EC nº 141 foi confirmada no DOU em 16/10/2026 (Edição 196-A, Seção 1 - Extra A, página 2; https://www.in.gov.br/en/web/dou/-/emenda-constitucional-n-141-738818165). GJ-01 está encerrado documentalmente; GJ-02 foi fechado por decisão do usuário em 28/10/2026 com base nas respostas profissionais reportadas, e GJ-03 está resolvido conforme essas respostas. Ressalvas de fonte/assinatura e risco residual permanecem registradas, sem alegação de verificação independente. GJ-04 continua bloqueando o lançamento.
- A geração de escalas deve rodar no navegador e concluir em até 10 segundos para 50 pessoas antes de ser publicada.

---

## Premissas de planejamento e escopo das versões

- O workspace contém somente o PRD. Tratar a implementação como greenfield e inicializar controle de versão antes de alterar código; selecionar/conectar o provedor Git e o projeto Vercel em uma etapa sob responsabilidade do proprietário.
- A contagem dos 30 dias começa quando houver validação jurídica e acesso ao repositório. A meta de 15/11/2026 indicada no PRD corresponde ao início em 16/10/2026; se algum pré-requisito atrasar, recalcular a data em vez de remover silenciosamente um gate de lançamento.
- A primeira versão exclui intencionalmente geração de escalas, importação CSV, persistência local, PDFs/imagens e modelos de documentos. Atualizar o roadmap e os critérios de sucesso do PRD para identificá-los como versões posteriores antes de iniciar a implementação.
- Estimativa para uma pessoa desenvolvedora: 4 semanas para a primeira versão; mais 2–4 semanas para persistência local, CSV e exportações; mais 3–6 semanas para pesquisa e implementação da geração de escalas. São intervalos de planejamento, não datas prometidas, e dependem da revisão jurídica e do benchmark do solver.
- Não criar commits antes de inicializar o workspace como repositório Git. Depois disso, criar commits por tarefa verificada, seguindo o padrão de mensagens do repositório.

## Estrutura de arquivos

- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`: scripts da aplicação, lockfile de dependências, verificação de tipos e exportação estática do Next.js.
- `src/domain/result.ts`: tipo discriminado compartilhado `Result<T, E>` para operações que podem falhar com erro exibível ao usuário.
- `src/domain/money/`: representação racional e adaptadores de parsing/formatação; o domínio nunca converte dinheiro para `number`.
- `src/app/`: estrutura de páginas geradas estaticamente, layout, estilos globais e rotas das funcionalidades client-side.
- `src/components/`: formulários acessíveis, tabelas de resultados, cartões de etapa, resumos de erro, linha do tempo e controles reutilizáveis.
- `src/domain/legal/`: conjuntos versionados de parâmetros legais e seleção por vigência.
- `src/domain/dates/`: cálculos de etapas por data civil e resolução da data atual em São Paulo.
- `src/domain/diagnostic/`: tipos de entrada/saída validados e cálculos de horas/custos por etapa.
- `src/domain/scenarios/`: validação de viabilidade e comparação/recomendação dos quatro cenários.
- `src/domain/schedule/`: restrições de escala, adaptador de solver, validação e operações de edição (versões posteriores).
- `src/features/assumptions/`, `src/features/diagnostic/`, `src/features/scenarios/`, `src/features/timeline/`: composição client-side das funcionalidades e estado dos formulários.
- `src/features/local-data/`, `src/features/import/`, `src/features/documents/`: persistência local, leitura CSV e exportações locais (versões posteriores).
- `tests/unit/`, `tests/components/`, `tests/e2e/`, `tests/fixtures/`: testes de domínio, UI, privacidade no navegador, responsividade, desempenho e fixtures determinísticas.
- `.github/workflows/ci.yml`: workflow de pull request para testes, verificação de tipos e build, se o provedor escolhido for GitHub.
- `docs/PRD — Copiloto de Transição 6x1.md`: escopo das versões e decisões aprovadas.

## Fase 0 — Preparação e gate jurídico

### Tarefa 1: Preparar o repositório e fechar o escopo da primeira versão

**Arquivos:**
- Modificar: `docs/PRD — Copiloto de Transição 6x1.md`
- Preparação: inicializar Git no workspace e conectar o provedor de controle de código escolhido pelo proprietário

**Interfaces:**
- Consome: design aprovado em `docs/superpowers/specs/2026-10-16-copiloto-plano-desenvolvimento-design.md`
- Produz: projeto greenfield sob controle de versão e PRD que distingue explicitamente a versão de 30 dias das capacidades posteriores.

- [ ] Registrar o proprietário/provedor do repositório e inicializar o controle de versão sem alterar o texto do PRD aprovado.
- [ ] Atualizar o roadmap para indicar que a versão 1 contém somente premissas manuais, diagnóstico, comparação de cenários e linha do tempo/checklist.
- [ ] Dividir a tabela dos seis módulos do MVP por versão: versão 1 com premissas manuais (sem CSV), diagnóstico, cenários e linha do tempo/checklist; versões posteriores com CSV, persistência, geração de escalas e exportação de documentos.
- [ ] Mover geração de escalas, CSV, persistência no navegador e documentos exportáveis para versões posteriores nomeadas; alinhar critérios de sucesso ao que pode ser avaliado sem telemetria do produto.
- [ ] Verificar que o PRD continua sem requisitos de conta, API, telemetria ou armazenamento no servidor.
- [ ] Revisar e concluir o gate jurídico pré-lançamento GJ-04: verificar que GJ-01 a GJ-03 estão registrados, confrontar parâmetros e testes com as decisões reportadas, revisar termos de uso e obter aprovação explícita para o release. GJ-02 foi fechado por decisão do usuário; suas ressalvas de fonte/assinatura e risco residual permanecem documentadas.
- [ ] Não iniciar a implementação de um cálculo afetado antes de validar a interpretação jurídica correspondente.

**Critério de saída:** repositório disponível, escopo do produto alinhado à primeira versão e premissas jurídicas dos cálculos incluídos refletidas conforme as decisões registradas; o release permanece bloqueado até GJ-04.

## Fase 1 — Primeira versão em 30 dias corridos

**Cadência para uma pessoa:** dias 1–3: Tarefa 1 e gate jurídico. Dias 4–7: Tarefas 2–4 (estrutura, datas legais e cálculos monetários). Dias 8–14: Tarefa 5 e primeira metade da Tarefa 7 (formulário do diagnóstico e linha do tempo). Dias 15–21: Tarefa 6 e restante do fluxo de UI. Dias 22–30: Tarefa 8, correções, aprovação jurídica e deploy. Se um gate ou teste falhar, resolvê-lo antes de polir a interface ou remover escopo sem aprovação.

### Tarefa 2: Criar a estrutura estática Next.js e os comandos de verificação

**Arquivos:**
- Criar: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`
- Criar: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Criar: `src/domain/result.ts`
- Criar: `vitest.config.ts`, `tests/setup.ts`, `tests/unit/smoke.test.ts`

**Interfaces:**
- `export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` é o tipo compartilhado para operações de domínio e armazenamento local que podem falhar.
- Produz scripts npm `dev`, `build`, `typecheck` e `test`; a Tarefa 8 adiciona `test:e2e` junto com Playwright.

- [ ] Criar o scaffold Next.js com TypeScript e App Router, usando a versão LTS do Node.js suportada pelo repositório.
- [ ] Configurar saída estática em `next.config.ts` com `const nextConfig: NextConfig = { output: "export", trailingSlash: true }; export default nextConfig;`; não adicionar rota de API, server action, pacote de analytics nem fonte/script externo.
- [ ] Configurar Vitest com React Testing Library e `tests/setup.ts`; em `tests/unit/smoke.test.ts`, renderizar `Home` e verificar `screen.getByRole("heading", { name: "Copiloto de Transição 6x1" }).toBeInTheDocument()`.
- [ ] Executar `npm test -- --run`, `npm run typecheck` e `npm run build`; esperar saída 0 em todos e geração da saída estática configurada.
- [ ] Confirmar que o build não contém handlers de rotas de API nem server actions.

**Critério de saída:** um clone limpo consegue instalar pelo lockfile e gerar o shell estático, com testes e verificação de tipos.

### Tarefa 3: Implementar parâmetros legais versionados e cálculos de datas

**Arquivos:**
- Criar: `src/domain/legal/legal-parameters.ts`
- Criar: `src/domain/dates/date-only.ts`
- Criar: `src/domain/dates/stages.ts`
- Testar: `tests/unit/legal-parameters.test.ts`
- Testar: `tests/unit/stages.test.ts`

**Interfaces:**
- `type LegalParameters = { version: string; status: "provisório" | "aprovado"; sourceUrl: string; publicationDate: string | null; weeklyHours: { beforePhase1: number; phase1: number; phase2: number } }`; a minuta provisória pode registrar a fonte e os limites em análise com `publicationDate: null`, sem datas efetivas inventadas.
- `getParametersForDate(date: string, versions: LegalParameters[]): Result<LegalParameters, ParameterSelectionError>` seleciona somente parâmetros com status `aprovado` e `publicationDate` oficial; retorna erro explícito se não existir versão aplicável aprovada/publicada (não faz fallback para versão provisória).
- `getStageDates(parameters: LegalParameters): Result<{ phase1: string; phase2: string }, LegalDateError>` usa provisoriamente `publicationDate` + 2 meses-calendário para a Etapa 1 e +12 meses-calendário desde a Etapa 1 para a Etapa 2; retorna erro explícito se `publicationDate` estiver ausente ou inválida. Dois meses-calendário não equivalem a 60 dias. Adicionar meses civis com ajuste para o último dia válido do mês de destino.
- `getWeeklyHourLimit(date: string, parameters: LegalParameters): Result<number, LegalDateError>` usa os limites por etapa e datas calculadas; retorna erro explícito para data de referência inválida ou publicationDate ausente/inválida.
- Todos os argumentos e resultados de data usam strings de data civil ISO (`YYYY-MM-DD`). Não declarar parâmetros reais aprovados/publicados antes do DOU e do fechamento dos gates de aprovação aplicáveis; as datas e a interação dos arts. 6º e 10 seguem as posições profissionais reportadas e o fechamento registrado de GJ-02, sem verificação independente neste plano.

- [x] Escrever testes com fixtures exclusivamente hipotéticas, incluindo `publicationDate` 16/10/2026 → Etapa 1 16/12/2026 → Etapa 2 16/12/2027; cobrir adição de meses civis, fim de mês, mudança de ano e ano bissexto (sem tratar mês-calendário como 60 dias).
- [x] Escrever testes para limites de 44/42/40 horas imediatamente antes e no início de cada vigência hipotética; verificar erros explícitos para publicationDate ausente/inválida e que a seleção retorna erro quando não houver parâmetros aprovados e publicados aplicáveis, mesmo que exista uma versão provisória com limites registrados.
- [x] Implementar aritmética de data civil sem depender do fuso horário local da máquina; usar `America/Sao_Paulo` ao resolver a data atual para a UI.
- [x] Rejeitar datas inválidas, versões de parâmetros com vigências sobrepostas e datas sem versão correspondente, com erros explícitos de validação.
- [x] Executar `npm test -- --run tests/unit/legal-parameters.test.ts tests/unit/stages.test.ts`; esperar aprovação de todos os casos.

**Critério de saída:** datas legais determinísticas, versionadas e testáveis sem a UI.

### Tarefa 4: Implementar aritmética monetária exata

**Arquivos:**
- Criar: `src/domain/money/rational.ts`
- Criar: `src/domain/money/decimal.ts`
- Criar: `src/domain/money/format-brl.ts`
- Testar: `tests/unit/money.test.ts`

**Interfaces:**
- `type Rational = { numerator: bigint; denominator: bigint }`
- `parseDecimal(input: string): Rational`
- `add(a: Rational, b: Rational): Rational`
- `multiply(a: Rational, b: Rational): Rational`
- `divide(a: Rational, b: Rational): Rational`
- `roundHalfEven(value: Rational, decimalPlaces: number): bigint` retorna o inteiro na unidade decimal solicitada (por exemplo, centavos para `decimalPlaces=2`).
- `formatBRL(value: Rational): string` formata somente um valor final para exibição.

- [ ] Testar parsing decimal em formato brasileiro, inteiros, valores negativos e entradas inválidas.
- [ ] Testar redução racional, soma, multiplicação, divisão, rejeição de denominador zero e empates half-even negativos.
- [ ] Testar que `2200 / 210` é exibido como `R$ 10,48`, enquanto `21 × 1,5 × (2200 / 210)` permanece exatamente `R$ 330,00`; o arredondamento antecipado da hora deve demonstrar o resultado incorreto `R$ 330,12`.
- [ ] Testar os limites half-even `2,345 → 2,34` e `2,355 → 2,36`, mantendo a aritmética sobre o valor racional original após a formatação.
- [ ] Implementar normalização de numerador/denominador com `bigint`; nunca converter valores de cálculo para `number` do JavaScript.
- [ ] Executar `npm test -- --run tests/unit/money.test.ts`; esperar aprovação de todos os valores exatos e casos-limite.

**Critério de saída:** resultados monetários mantêm exatidão em divisões periódicas e arredondam somente na exibição final.

### Tarefa 5: Implementar os cálculos de diagnóstico no domínio

**Arquivos:**
- Criar: `src/domain/diagnostic/types.ts`
- Criar: `src/domain/diagnostic/validate-diagnostic-input.ts`
- Criar: `src/domain/diagnostic/calculate-diagnostic.ts`
- Testar: `tests/unit/diagnostic.test.ts`
- Testar: `tests/unit/diagnostic-validation.test.ts`
- Testar: `tests/fixtures/diagnostic-cases.ts`

**Interfaces:**
- `type EmployeeAssumption = { localId: string; salary: Rational; weeklyHours: Rational; contractType: "full-time" | "part-time" }`
- `type CoverageAssumption = { weekday: number; startMinute: number; endMinute: number; minimumPeople: number }`
- `type DiagnosticInput = { employees: EmployeeAssumption[]; coverage: CoverageAssumption[]; referenceDate: string; legalParameters: LegalParameters }`
- `type DiagnosticStageResult = { stageId: string; weeklyLimitHours: Rational; availableHours: Rational; requiredPersonHours: Rational; deficitPersonHours: Rational; hourlyCostByLocalId: Record<string, Rational> }`
- `type DiagnosticResult = { referenceDate: string; legalParameterVersion: string; stages: DiagnosticStageResult[] }`
- `calculateDiagnostic(input: DiagnosticInput): Result<DiagnosticResult, DiagnosticValidationError[]>`
- `validateDiagnosticInput(input: DiagnosticInput): Result<void, DiagnosticValidationError[]>` valida premissas estruturais e não calcula valores do diagnóstico.
- `DiagnosticValidationError` contém um identificador estável de campo e uma mensagem exibível ao usuário.
- `DiagnosticResult` é dado de cálculo imutável, sem nomes de funcionários ou identificadores externos.

**Definição aprovada para os cálculos de diagnóstico:** calcular horas exigidas somando, para cada faixa semanal, `(endMinute - startMinute) / 60 × minimumPeople`; a disponibilidade individual em cada etapa é o menor valor entre a jornada semanal informada e o teto legal da etapa; a disponibilidade da equipe é a soma individual. O déficit é `max(0, requiredPersonHours - availableHours)`. O custo-hora individual por etapa é salário mensal dividido pelo divisor correspondente (220/210/200 para 44/42/40 horas). Retornar resultados para as três etapas. Se a publicação ou uma data de etapa necessária estiver ausente/inválida, retornar erro explícito e não usar data ou parâmetro substituto.

- [x] Definir os tipos de entrada/saída e adicionar validação sem cálculos: equipe não vazia, identificadores locais únicos, valores racionais positivos, data civil válida e limites/ordem de intervalos de cobertura.
- [x] Testar a validação de premissas válidas e inválidas em `tests/unit/diagnostic-validation.test.ts`.
- [ ] Criar testes inicialmente falhos para as fixtures aprovadas: disponibilidade semanal para 4 pessoas nos limites 44/42/40 h, exigência de 180 horas-pessoa e déficits de 4/12/20 h.
- [ ] Adicionar testes de cálculo para ausência de déficit, déficit positivo e preservação do salário.
- [ ] Implementar o diagnóstico como função pura usando os parâmetros da Tarefa 3 e operações racionais da Tarefa 4, segundo as posições reportadas e registradas nos GJ-02/GJ-03 fechados; manter parâmetros provisórios até GJ-04 e não publicar o produto antes de sua conclusão.
- [x] Executar `npm test -- --run tests/unit/diagnostic-validation.test.ts`; os testes de validação passam sem produzir resultados calculados.

**Critério parcial:** os tipos e a validação explícita de premissas estão implementados. O cálculo do diagnóstico pode seguir as regras registradas nos GJ-02/GJ-03; o lançamento continua bloqueado até a conclusão de GJ-04.

### Tarefa 6: Implementar viabilidade e recomendação de cenários

**Arquivos:**
- Criar: `src/domain/scenarios/types.ts`
- Criar: `src/domain/scenarios/simulate-scenarios.ts`
- Testar: `tests/unit/scenarios.test.ts`

**Interfaces:**
- `type ScenarioAssumptions = { replacementSalary: Rational; employerChargesRate: Rational; monthlyRevenueLoss: Rational }`
- `type ScenarioId = "hire-full-time" | "hire-part-time" | "overtime" | "reduce-hours"`
- `type ScenarioResult = { id: ScenarioId; monthlyCost: Rational; feasible: boolean; reasons: string[]; recommended: boolean }`
- `simulateScenarios(diagnostic: DiagnosticResult, assumptions: ScenarioAssumptions): Result<ScenarioResult[], ScenarioValidationError[]>`
- Todo cenário viável retornado tem custo calculado; cenários inviáveis exibem custo estimado quando calculável e sempre incluem um motivo.
- `ScenarioValidationError` contém um identificador estável de campo e uma mensagem exibível ao usuário.

- [ ] Testar os quatro custos dos exemplos aprovados, incluindo encargos de 60% e fator de conversão semanal para mensal.
- [ ] Testar os motivos de inviabilidade para redução salarial e limites diários de hora extra.
- [ ] Testar recomendação da opção viável de menor custo e desempate determinístico.
- [ ] Implementar cenários com aritmética racional exata e motivo visível para cada opção inviável; nunca recomendar cenário inviável.
- [ ] Executar `npm test -- --run tests/unit/scenarios.test.ts`; esperar aprovação dos cenários e desempates.

**Critério de saída:** os quatro cenários são comparáveis, matematicamente exatos e têm recomendação coberta por testes.

### Tarefa 7: Criar a interface acessível de premissas e linha do tempo

**Arquivos:**
- Criar: `src/features/assumptions/assumptions-form.tsx`
- Criar: `src/features/diagnostic/diagnostic-panel.tsx`
- Criar: `src/features/timeline/legal-timeline.tsx`
- Criar: `src/features/scenarios/scenario-comparison.tsx`
- Criar: `src/app/diagnostico/page.tsx`
- Criar: `src/components/error-summary.tsx`
- Testar: `tests/components/assumptions-form.test.tsx`
- Testar: `tests/components/scenario-comparison.test.tsx`

**Interfaces:**
- O formulário produz `DiagnosticInput` somente no estado em memória do cliente.
- Os painéis de diagnóstico e cenários consomem `DiagnosticResult` e `ScenarioResult[]`; componentes de UI não implementam cálculos jurídicos ou monetários.
- `LegalTimeline` consome `LegalParameters` e estado de checklist mantido em memória.

- [ ] Testar campos obrigatórios, salário/jornada inválidos, rótulos acessíveis, links do resumo de erros e ausência de campos de nome, CNPJ ou e-mail de funcionários.
- [ ] Testar que a comparação exibe os quatro cenários, marca inviabilidades com seus motivos e identifica somente a recomendação calculada pelo domínio.
- [ ] Implementar o fluxo: premissas manuais → diagnóstico por etapa legal → comparação de cenários → linha do tempo/checklist na aplicação.
- [ ] Manter os dados de entrada na memória do cliente, gerar rótulos anônimos locais para as pessoas na equipe e exibir a versão dos parâmetros legais utilizada.
- [ ] Executar `npm test -- --run tests/components`; esperar aprovação dos testes de componentes sem alertas de rótulos acessíveis.

**Critério de saída:** usuário conclui o fluxo principal sem criar conta ou transmitir dados pela rede.

### Tarefa 8: Verificar privacidade, responsividade e build de lançamento

**Arquivos:**
- Criar: `tests/e2e/privacy.spec.ts`
- Criar: `tests/e2e/core-flow.spec.ts`
- Criar: `playwright.config.ts`
- Adicionar: Playwright e `serve` como dependências de desenvolvimento para testes no navegador do build estático `out/`.
- Criar: `.github/workflows/ci.yml` se GitHub for o provedor escolhido.
- Modificar: `package.json`, `next.config.ts`

**Interfaces:**
- Os testes Playwright exercitam o build estático `out/`, servido localmente pelo script `serve`.
- As verificações de rede permitem assets estáticos da mesma origem e requisições de metadados da hospedagem, mas falham se entradas/resultados operacionais forem enviados a endpoints da aplicação ou origens externas.

- [ ] Testar o fluxo principal em 390 × 844 e 1440 × 900; após cada etapa, confirmar ausência de overflow horizontal e que o controle primário está visível, desobstruído e utilizável.
- [ ] Interceptar requisições durante preenchimento de salários, cálculo de resultados e alteração de cenários; confirmar que corpo, query string e requisições a origens externas não incluem premissas nem resultados operacionais.
- [ ] Testar que recarregar a página apaga as premissas mantidas em memória na primeira versão.
- [ ] Configurar `test:e2e` para servir o build estático e executar Playwright; rodar `npm run test:e2e` e esperar aprovação do fluxo, privacidade e viewports.
- [ ] Executar `npm run typecheck`, `npm test -- --run` e `npm run build`; exigir saída 0 em cada comando.
- [ ] Publicar um preview na Vercel, inspecionar o build para evitar rotas de API acidentais e confirmar manualmente a exibição do aviso de privacidade e da versão legal utilizada.
- [ ] Publicar somente após aprovação jurídica, sucesso do CI, testes de privacidade e revisão do checklist de release.

**Critério de saída:** versão estática publicada e utilizável em celular/desktop; nenhum dado operacional sai do navegador; todos os gates de release aprovados.

## Fase 2 — Dados locais, CSV e exportação de documentos

### Tarefa 9: Adicionar persistência opcional no navegador com exclusão completa

**Arquivos:**
- Criar: `src/features/local-data/local-data-store.ts`
- Criar: `src/features/local-data/data-controls.tsx`
- Testar: `tests/unit/local-data-store.test.ts`
- Testar: `tests/e2e/local-data.spec.ts`

**Interfaces:**
- `type PersistableAssumptions = { schemaVersion: 1; savedAt: string; assumptions: { employeeRows: Array<{ localId: string; salaryDecimal: string; weeklyHoursDecimal: string; contractType: "full-time" | "part-time" }>; coverage: CoverageAssumption[]; referenceDate: string; legalParameterVersion: string } }`
- `type StorageError = { code: "unavailable" | "quota" | "invalid-data"; message: string }`
- `saveLocalAssumptions(value: PersistableAssumptions): Result<void, StorageError>`
- `loadLocalAssumptions(): Result<PersistableAssumptions | null, StorageError>`
- `clearLocalAssumptions(): Result<void, StorageError>`
- A persistência é opt-in, local ao navegador, versionada e contém somente as premissas necessárias para restaurar o trabalho do usuário.

- [ ] Testar opt-in, restauração válida após reload, dados malformados/esquema antigo, erros de quota/segurança e ausência de escrita antes do opt-in.
- [ ] Testar que a exclusão explícita remove o estado ativo e todas as chaves locais da ferramenta; verificar após reload que nenhuma premissa apagada retorna.
- [ ] Limpar também o estado em memória do React quando o usuário confirmar a exclusão.
- [ ] Implementar adaptador de armazenamento com erros visíveis; se o armazenamento falhar, manter a sessão atual utilizável e não afirmar que os dados foram salvos.
- [ ] Executar `npm test -- --run tests/unit/local-data-store.test.ts tests/e2e/local-data.spec.ts`; esperar aprovação dos casos de persistência e exclusão.
- [ ] Reexecutar os testes E2E de privacidade para provar que não surgiu transmissão nem sincronização remota.

**Critério de saída:** persistência local opt-in, recuperável e totalmente apagável, sem sair do navegador.

### Tarefa 10: Adicionar importação local de CSV

**Arquivos:**
- Criar: `src/features/import/parse-assumptions-csv.ts`
- Criar: `src/features/import/csv-import.tsx`
- Adicionar: dependência compatível com navegador `papaparse` somente para parsing local de CSV.
- Testar: `tests/unit/parse-assumptions-csv.test.ts`
- Testar: `tests/e2e/csv-import.spec.ts`

**Interfaces:**
- `parseAssumptionsCsv(contents: string): Result<ImportPreview, CsvImportError[]>`
- `type ImportPreview = { validRows: EmployeeAssumption[]; errors: CsvImportError[] }`
- `type CsvImportError = { row: number; field: string; code: string; message: string }`
- `ImportPreview` contém somente campos normalizados para os cálculos e mensagens de validação por linha; colunas desconhecidas são descartadas.

- [ ] Testar arquivo válido, colunas obrigatórias ausentes, linhas duplicadas, decimal/data malformados, codificação incompatível, arquivo vazio e colunas identificadoras adicionais.
- [ ] Configurar o parser para usar cabeçalhos e texto local; ler o conteúdo no navegador, sem enviar o arquivo, persistir seu conteúdo original ou reter colunas desnecessárias.
- [ ] Exibir uma prévia local e exigir confirmação do usuário antes de aplicar as premissas importadas.
- [ ] Executar `npm test -- --run tests/unit/parse-assumptions-csv.test.ts tests/e2e/csv-import.spec.ts`; confirmar que o navegador não faz requisição de upload.

**Critério de saída:** importação CSV compreensível, rejeição explícita de linhas inválidas e processamento comprovadamente local.

### Tarefa 11: Gerar PDFs/imagens e modelos de documentos localmente

**Arquivos:**
- Criar: `src/features/documents/build-diagnostic-report.ts`
- Criar: `src/features/documents/build-employee-templates.ts`
- Criar: `src/features/documents/download-local-file.ts`
- Adicionar: dependências client-side `jspdf` e `html-to-image`; a geração não pode chamar serviço externo de conversão.
- Testar: `tests/unit/documents.test.ts`
- Testar: `tests/e2e/local-exports.spec.ts`

**Interfaces:**
- `type PrintableReport = { title: string; sections: Array<{ heading: string; rows: Array<{ label: string; value: string }> }>; legalNotice: string; legalParameterVersion: string }`
- `type EmployeeTemplate = { title: string; body: string; legalNotice: string; legalParameterVersion: string }`
- `buildDiagnosticReport(result: DiagnosticResult, parameters: LegalParameters): PrintableReport`
- `buildEmployeeTemplates(result: DiagnosticResult): EmployeeTemplate[]`
- `downloadLocalFile(blob: Blob, filename: string): Result<void, { message: string }>`
- Todo relatório/modelo gerado inclui o aviso legal da RN-15 e a versão dos parâmetros legais.

- [ ] Testar conteúdo dos relatórios, aviso legal, versão dos parâmetros, totais exatos formatados por localidade e nomes de arquivo estáveis.
- [ ] Gerar PDF/imagem localmente a partir do resultado já carregado; não chamar serviço de conversão.
- [ ] Testar download bem-sucedido e tratamento de erro visível quando o navegador não permitir baixar.
- [ ] Executar testes unitários e de navegador; inspecionar artefatos gerados com fixtures determinísticas e confirmar que nenhuma requisição de rede contém resultados.

**Critério de saída:** documentos e exportações exigidos são gerados localmente e contêm o aviso aplicável.

## Fase 3 — Geração e edição de escalas

### Tarefa 12: Comparar estratégias de geração de escalas por benchmark

**Arquivos:**
- Criar: `src/domain/schedule/types.ts`
- Criar: `src/domain/schedule/constraints.ts`
- Criar: `tests/fixtures/schedule-benchmarks.ts`
- Criar: `tests/unit/schedule-benchmark.test.ts`

**Interfaces:**
- `type ScheduleInput = { employees: EmployeeAssumption[]; coverage: CoverageAssumption[]; startDate: string; weeks: number; legalParameters: LegalParameters }`
- `type Shift = { localId: string; date: string; startMinute: number; durationMinutes: number; breakMinutes: number }`; `durationMinutes` may cross midnight, and the end instant is calculated from the local start date/time.
- `type Schedule = { shifts: Shift[]; legalParameterVersion: string }`
- `validateSchedule(schedule: Schedule, input: ScheduleInput): ScheduleViolation[]`
- `type ScheduleViolation = { ruleId: string; localId?: string; message: string }`

- [ ] Criar casos sintéticos determinísticos para 5, 20 e 50 pessoas; incluir cobertura de fim de semana, dois dias de repouso, limites semanais, horas extras diárias, intervalos entre jornadas e acordos coletivos.
- [ ] Comparar uma heurística construtiva simples e um protótipo exato/de restrições em Web Worker ou runtime compatível com navegador.
- [ ] Rejeitar soluções que retornem silenciosamente escala inválida, bloqueiem a interface, excedam 10 segundos para 50 pessoas ou exijam envio de premissas a servidor.
- [ ] Usar o runner de CI do repositório e Chromium headless como base reproduzível de desempenho; medir o tempo de geração separadamente da inicialização da página e criação das fixtures.
- [ ] Registrar a solução escolhida e o tempo medido antes de implementá-la; se nenhuma atender aos gates, reduzir as restrições suportadas ou adiar o release, sem enfraquecer a validação legal.

**Critério de saída:** escolha de solver baseada em evidências e benchmark determinístico com todas as restrições legais exigidas.

### Tarefa 13: Implementar geração e validação de escalas

**Arquivos:**
- Criar: `src/domain/schedule/generate-schedule.ts`
- Criar: `src/domain/schedule/validate-schedule.ts`
- Criar: `src/domain/schedule/solver-adapter.ts`
- Criar: `src/features/schedule/schedule-generator.tsx`
- Testar: `tests/unit/generate-schedule.test.ts`
- Testar: `tests/unit/validate-schedule.test.ts`
- Testar: `tests/e2e/schedule-generation.spec.ts`

**Interfaces:**
- `generateSchedule(input: ScheduleInput): Promise<Result<Schedule, ScheduleGenerationError>>`
- `validateSchedule(schedule: Schedule, input: ScheduleInput): ScheduleViolation[]`
- `type ScheduleGenerationError = { code: "timeout" | "no-solution" | "invalid-input"; message: string }`
- A geração retorna erros explícitos de timeout/ausência de solução; nunca classifica como válida uma escala não validada.

- [ ] Escrever testes de regra inicialmente falhos para repouso semanal, alternância de domingos, exceção de média mensal 12x36, cobertura, hora extra e intervalos.
- [ ] Implementar o gerador atrás do adaptador de solver/heurística medido; validar todos os resultados com `validateSchedule`.
- [ ] Executar benchmark sintético para 50 pessoas e impor o limite de 10 segundos em teste determinístico de desempenho com base de hardware acordada.
- [ ] Testar que demanda impossível retorna resultado acionável de ausência de solução e nunca um fallback com aparência de sucesso.
- [ ] Executar testes unitários/E2E de escala e toda a regressão antes de habilitar a funcionalidade.

**Critério de saída:** escalas geradas validadas, com desempenho adequado e explicação de inviabilidade.

### Tarefa 14: Adicionar edição manual e exportação de escalas

**Arquivos:**
- Criar: `src/features/schedule/schedule-editor.tsx`
- Modificar: `src/features/documents/download-local-file.ts`
- Testar: `tests/components/schedule-editor.test.tsx`
- Testar: `tests/e2e/schedule-edit-export.spec.ts`

**Interfaces:**
- O editor recebe `Schedule` e `ScheduleInput`, retorna uma `Schedule` atualizada e revalida cada edição com `validateSchedule`.
- A exportação consome somente escalas validadas e gera PDF/imagem localmente.

- [ ] Testar que cada edição mostra imediatamente violações afetadas e que a escala não pode aparecer aprovada enquanto houver violações.
- [ ] Testar controles de edição acessíveis por teclado e renderização responsiva da escala.
- [ ] Exportar uma escala válida localmente em PDF e imagem, incluindo aviso legal; rejeitar exportação se a geração falhar.
- [ ] Executar testes do editor, exportação, privacidade de rede e responsividade; exigir aprovação de toda a regressão.

**Critério de saída:** usuário consegue editar, revalidar e exportar uma escala localmente sem ocultar violações.

## Gates de lançamento

- **Primeira versão:** Tarefas 1–8 concluídas; publicação final no DOU confirmada; GJ-01 a GJ-03 registrados como encerrados (GJ-02 por decisão do usuário, com ressalvas documentais preservadas); GJ-04 concluído com aprovação jurídica pré-lançamento; build estático na Vercel; nenhum dado operacional transmitido pela rede; CI aprovado. Enquanto GJ-04 estiver pendente, não há release nem seleção de parâmetro aprovado; fixtures servem apenas a testes.
- **Versão de dados locais/documentos:** Tarefas 9–11 concluídas; teste de exclusão após reload aprovado; testes de CSV/exportação comprovam ausência de upload ou conversão externa.
- **Versão de escalas:** Tarefas 12–14 concluídas; todas as regras de escala cobertas; benchmark para 50 pessoas concluído em até 10 segundos no navegador/hardware acordados.
- Em cada versão, atualizar o PRD e os avisos legais/de privacidade para descrever somente o comportamento efetivamente publicado.
