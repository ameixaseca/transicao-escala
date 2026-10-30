# Design — Interface do fluxo principal

## Objetivo e decisões aprovadas

Construir a interface do release inicial do Copiloto de Transição 6x1 para entrada manual de premissas, diagnóstico por etapa, comparação de cenários e consulta à linha do tempo/checklist. O usuário aprovou:

- Painel com navegação fixa e todas as seções acessíveis desde o início.
- Estado de conformidade por verificação e etapa: `valid`, `invalid` ou `unknown`, com `unknown` como padrão.
- Uma página client-side coordenadora com componentes separados e estado apenas em memória.
- Campos de premissas do diagnóstico separados dos parâmetros financeiros e verificações dos cenários.
- Checklist operacional sem alegação de certificação jurídica.
- Exibição dos marcos de GJ-02 como provisórios, preservando o status provisório dos parâmetros e o aviso de GJ-04 pendente.

## Escopo

### Incluído

- Formulário manual para equipe, cobertura necessária e data de referência.
- Diagnóstico por etapa legal com base em `DiagnosticInput` e `DiagnosticResult`.
- Comparação dos quatro cenários já implementados, consumindo `ScenarioAssumptions` e resultados do domínio.
- Linha do tempo com marcos e checklist operacional em memória.
- Validação acessível, estados pendentes e resumo navegável de erros.
- Identificação visível da versão e do status dos parâmetros legais.
- Interface responsiva e testes de componentes; o teste end-to-end de privacidade e viewports continua coberto pela Tarefa 8 do plano.

### Excluído

Geração ou edição de escalas, importação CSV, persistência após recarregar, exportação, cadastro/login, APIs de produto, telemetria, integrações e parecer ou certificação jurídica. A interface não fecha GJ-04 nem autoriza publicação do produto.

## Arquitetura e limites

- Implementar o fluxo na rota `/diagnostico`, como uma página estática/client-side. A página coordena estado e navegação; não contém fórmulas legais ou monetárias.
- Manter componentes separados para formulário de premissas, painel de diagnóstico, comparação de cenários, timeline/checklist e resumo de erros. Eles recebem e emitem valores tipados, delegando cálculos e validações aos módulos de domínio existentes.
- O estado da sessão inclui premissas, pressupostos financeiros, verificações por etapa e checklist. Alterar uma premissa invalida os resultados dependentes antes de qualquer novo cálculo. Recarregar a página descarta todos os dados.
- Usar os tipos e serviços existentes (`DiagnosticInput`, `DiagnosticResult`, `ScenarioAssumptions`, `ScenarioStageResult`, `LegalParameters`, `calculateDiagnostic`, `getStageDates` e `simulateScenarios`) em vez de duplicar regras na interface.
- Rótulos da equipe são anônimos e gerados localmente. Não solicitar nome, e-mail, CNPJ ou outro identificador pessoal.
- O padrão visual segue o painel escolhido: navegação lateral fixa no desktop; navegação compacta, acessível e sem sobreposição do conteúdo em celular.

## Premissas e fluxo de dados

### Premissas do diagnóstico

1. **Data de referência:** campo de data inicialmente preenchido com a data atual conforme a regra de fuso de São Paulo já usada pelo projeto. A data contextualiza o resultado e a etapa vigente na timeline; o diagnóstico continua mostrando as três etapas legais, conforme o domínio existente.
2. **Equipe:** linhas adicionáveis/removíveis com rótulos locais (“Pessoa 1”, “Pessoa 2” etc.), salário mensal, horas semanais e tipo de contrato integral/parcial. Os valores são convertidos para os tipos exatos do domínio, sem cálculos financeiros em ponto flutuante na interface.
3. **Cobertura:** linhas adicionáveis/removíveis com dia da semana, início, fim e quantidade mínima de pessoas. A validação do domínio permanece a fonte de verdade; erros são associados aos campos correspondentes.
4. **Parâmetros legais:** exibir versão, status e fonte em modo somente leitura. Não oferecer controles para o usuário alterar parâmetros normativos.

O formulário produz um `DiagnosticInput` apenas no cliente. Um diagnóstico válido apresenta, por etapa, limite semanal, horas disponíveis, horas-pessoa exigidas, déficit/sobra e custo-hora por rótulo anônimo. Antes de entradas válidas, mostrar instruções e pendências, nunca resultados antigos.

### Pressupostos e resultados dos cenários

Na seção Cenários, solicitar salário de reposição, taxa configurável de encargos e perda mensal estimada pela redução do horário. Validar os valores pelo domínio antes de chamar `simulateScenarios`.

Para cada etapa, apresentar as cinco verificações já definidas no domínio: jornada diária, repousos semanais, intervalo entre jornadas, intervalo intrajornada e preservação salarial. Cada verificação oferece os estados **Válido**, **Inválido** e **Não verificado**; todas começam como **Não verificado** e ficam identificadas como informação declarada pelo usuário.

Exibir os quatro cenários do domínio: contratação integral, contratação parcial, horas extras e redução do horário. Cada resultado inclui custo mensal, estado de viabilidade e motivos. Usar os resultados do domínio para indicar inviabilidade, incompletude, ausência de necessidade ou recomendação. Uma verificação desconhecida não pode produzir uma recomendação; não representar o resultado como escala validada ou parecer jurídico.

## Parâmetros legais, datas e ressalva de lançamento

O objeto provisório de parâmetros usado pelo fluxo deve identificar a EC nº 141 (não a minuta do Senado), registrar sua publicação em **16/10/2026**, manter `status: "provisório"` e apontar para a fonte oficial do DOU: <https://www.in.gov.br/en/web/dou/-/emenda-constitucional-n-141-738818165>. A configuração não deve ser marcada como aprovada. A seleção de versões aprovadas continua distinta do uso explícito dessa configuração provisória para simulação informativa.

Calcular marcos pelas funções de data do domínio, sem duplicar datas na UI:

- Etapa 1: **16/12/2026**.
- Etapa 2: **16/12/2027**.

Não deslocar marcos por fins de semana ou feriados. Para a regra conservadora de transição semanal, apresentar os períodos **14–20/12/2026** e **13–19/12/2027**, com o aviso: “Nesta semana passa a valer a nova jornada. Confira se a escala observa a regra nova.”

Em todas as seções de resultado e timeline, identificar que os parâmetros são provisórios, que as posições jurídicas se baseiam nas respostas reportadas e que GJ-04 (conferência documental e assinatura profissional) continua pendente e bloqueia o lançamento. Se a função de datas falhar, mostrar erro explícito e não criar marcos de fallback.

## Linha do tempo e checklist

A timeline é acessível mesmo sem diagnóstico. Para cada marco, mostrar data, semana de transição, limite aplicável e versão/status da base legal. Se os parâmetros não puderem produzir datas, manter a seção acessível e explicar a causa.

Para cada marco, manter em memória caixas desmarcadas inicialmente:

1. Revisar limite de jornada e instrumento coletivo aplicável.
2. Conferir repousos e intervalos.
3. Verificar regras setoriais de domingos e feriados.
4. Revisar remuneração, divisor e preservação salarial.
5. Identificar regimes ou contratos especiais que exigem análise fora do MVP.

Marcar um item significa somente “conferido pelo usuário”; não altera os resultados do diagnóstico ou do simulador e não declara conformidade jurídica.

## Erros, acessibilidade e privacidade

- Mostrar erros de validação junto aos respectivos campos e em um resumo navegável que leve ao campo/seção. Não ocultar falhas, usar defaults com aparência de sucesso ou engolir exceções.
- Navegação, formulários, estados e ações devem funcionar por teclado, ter foco visível e rótulos acessíveis. Não comunicar status apenas por cor.
- No celular, reorganizar conteúdo sem overflow horizontal; preservar acesso à navegação e aos controles primários. No desktop, manter a navegação lateral.
- Manter premissas e resultados somente em memória do cliente. Não usar `localStorage`, cookies de produto, analytics, APIs, telemetria ou chamadas externas com dados operacionais.
- Recursos estáticos e metadados técnicos permitidos pela política do projeto não podem transportar valores de entrada ou resultados.

## Verificação e critérios de aceite

1. Testes de componentes cobrem campos obrigatórios e inválidos, rótulos anônimos, acessibilidade, links do resumo de erros e estados pendentes.
2. Testes de componentes cobrem os quatro cenários, exibição de motivos, os três estados de cada verificação e a ausência de recomendação enquanto verificações necessárias estiverem desconhecidas.
3. Testes da timeline cobrem os dois marcos e respectivas semanas de transição, estados de parâmetros provisórios e erro explícito quando não houver datas calculáveis.
4. O fluxo de premissas → diagnóstico → cenários → timeline funciona sem conta e sem transmitir dados operacionais.
5. O teste end-to-end previsto na Tarefa 8 confirma comportamento em 390 × 844 e 1440 × 900, ausência de overflow horizontal, descarte de dados ao recarregar e ausência de transmissão de premissas/resultados.
6. GJ-04 permanece um bloqueio de lançamento independentemente dos resultados dos testes funcionais.

## Escopo de implementação

Este design corresponde à Tarefa 7 do plano principal. A implementação deve integrar os componentes na página `/diagnostico`, reutilizar o domínio e os padrões de estilo/teste existentes, sem criar um segundo motor de cálculo nem adicionar dependências sem necessidade.
