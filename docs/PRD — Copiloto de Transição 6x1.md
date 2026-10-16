# PRD — Copiloto de Transição 6x1

Oct 16, 2026 · @Luiz Paulo

## 1. Visão geral

O Copiloto de Transição 6x1 é uma ferramenta web gratuita, sem login, que ajuda pequenos empregadores a calcular o custo da nova jornada e comparar cenários de adaptação. O release inicial de 30 dias inclui premissas manuais, diagnóstico, comparação de cenários e linha do tempo/checklist legal. Importação CSV, persistência local, geração/edição de escalas 5x2 e geração/exportação de documentos ficam para releases posteriores. A aplicação será construída com Next.js e TypeScript e publicada na Vercel. Todo processamento ocorre no navegador, inclusive as funcionalidades posteriores. A aplicação não coleta nem transmite dados operacionais inseridos pelo usuário e não oferece contas, APIs de produto, banco de dados, telemetria, analytics, pixels ou integrações com terceiros.

O usuário informa apenas as premissas necessárias aos cálculos. A ferramenta não solicita nome, CNPJ, e-mail ou identificadores de funcionários; usa rótulos anônimos gerados localmente para distinguir pessoas. No release inicial, premissas e resultados permanecem apenas em memória durante a sessão, sem persistência local ou remota e sem restauração após recarregar. Em release posterior, o usuário poderá optar por salvar premissas somente no armazenamento local do navegador, com uma ação explícita para apagar esses dados. O provedor de hospedagem pode processar metadados técnicos de acesso, distintos das premissas e resultados dos cálculos.

**Status jurídico: pendente e bloqueante.** O contexto, os fatos e as fontes abaixo são registros existentes do PRD, não fatos confirmados nesta tarefa nem conteúdo juridicamente aprovado. A data efetiva, o texto oficial e as interpretações legais ainda exigem confirmação e revisão por advogado trabalhista. Os gates da seção 8 bloqueiam a implementação dos cálculos afetados e o lançamento; o prazo de 30 dias não dispensa esses gates. Esta tarefa é apenas documental e não implementa cálculos jurídicos.

**Contexto legal.** O Senado aprovou a PEC 221/2019 em 14/10/2026, por 75 votos a 1, em dois turnos ([Senado Notícias](https://www12.senado.leg.br/noticias/materias/2026/10/14/senado-aprova-fim-da-6x1-em-primeiro-turno)). A promulgação foi marcada para 16/10/2026. O texto aprovado estabelece:

| Marco | Quando | O que muda |
| --- | --- | --- |
| Etapa 1 | Promulgação + 60 dias | Jornada máxima de 42 h/semana; dois dias de repouso semanal remunerado, um deles preferencialmente aos domingos |
| Etapa 2 | Fim da Etapa 1 + 12 meses (promulgação + 14 meses) | Jornada máxima de 40 h/semana |
| Exceção | A partir da Etapa 1 | Escala 12x36 e atividades essenciais podem, por acordo ou convenção coletiva, compensar o repouso para garantir, na média, dois dias por semana dentro do mês-calendário |

Nenhuma etapa permite redução de salário. Na prática, o custo por hora trabalhada sobe cerca de 4,8% na Etapa 1 (44 h → 42 h) e 10% na Etapa 2 (44 h → 40 h).

Fontes: [Senado Notícias](https://www12.senado.leg.br/noticias/senado-agora/2026/10/14/aprovado-em-segundo-turno-fim-da-6x1-vai-a-promulgacao), [Diario de Pernambuco](https://www.diariodepernambuco.com.br/politica/2026/05/11715177-fim-da-escala-6x1-veja-como-votaram-os-deputados-de-pernambuco.html), [Juruá Comunicação](https://juruacomunicacao.com.br/senado-aprova-pec-que-acaba-com-a-escala-6x1-texto-vai-a-promulgacao/). A data efetiva de promulgação e o texto final publicado no DOU precisam ser confirmados antes do lançamento.

## 2. Problema e público-alvo

O pequeno empregador que opera na 6x1 precisa entender o custo da mudança e reorganizar a equipe, mas nem sempre tem RH ou ferramentas que ajudem a comparar alternativas. A ferramenta permite fazer esse diagnóstico sem criar uma conta nem enviar premissas operacionais a um serviço.

**Segmentos prioritários:** comércio varejista, bares e restaurantes, salões e estética, mercados e padarias, com 1 a 50 funcionários CLT. O limite é do MVP e não implica cadastro de empresa ou identificação de pessoas.

| Persona | Quem é | O que precisa |
| --- | --- | --- |
| Dona do negócio | Responsável por um restaurante que abre de terça a domingo | Saber o custo extra e consultar o checklist; gerar escala que cubra o fim de semana em release posterior |
| Gerente de loja | Responsável por uma loja pequena | Comparar cenários; ajustar uma escala para a equipe em release posterior |
| Contador | Profissional que orienta pequenos empregadores | Usar a ferramenta localmente com premissas manuais; exportar relatório para compartilhar por conta própria em release posterior |

## 3. Objetivos e métricas

**Objetivos do release inicial**

- Em até 10 minutos, o usuário sabe o custo mensal da adaptação em cada etapa.
- O usuário compara os quatro cenários e escolhe uma opção com custos e restrições explícitos, sem gerar ou editar escalas.
- O usuário consulta prazos legais, pendências e checklist dentro da ferramenta.
- O usuário consegue concluir o fluxo sem login e sem transmitir dados operacionais à aplicação.

A geração de escala 5x2 válida e a exportação de documentos permanecem objetivos de releases posteriores, não critérios de aceite do release de 30 dias.

**Não-objetivos:** controle de ponto, folha de pagamento, integração com eSocial, parecer jurídico, cadastro de contas ou empresas, compartilhamento ou processamento remoto de dados.

**Critérios de sucesso sem telemetria do produto:**

| Critério | Como avaliar |
| --- | --- |
| Correção das regras de negócio | Cobertura automatizada de cada regra aplicável e resultados esperados verificados nos cenários, conforme o recorte por release da seção 7; aceite condicionado aos gates jurídicos da seção 8 |
| Completude do release inicial | Verificação documental e testes do fluxo: entrada manual → diagnóstico por etapa → comparação dos quatro cenários e escolha → linha do tempo/checklist legal, sem depender de CSV, persistência, escala ou exportação |
| Facilidade de uso | Sessões de usabilidade sem instrumentação ou coleta de dados pelo produto |
| Tempo até o primeiro resultado | Até 10 minutos, avaliado em testes de usabilidade |
| Privacidade local | Testes automatizados confirmam que dados operacionais não são enviados a endpoints da aplicação ou origens externas e que não há chamadas a serviços ou integrações de terceiros; requisições comuns de assets estáticos e metadados técnicos à hospedagem permanecem permitidos |
| Experiência responsiva | Teste automatizado do fluxo principal em viewports de 390 × 844 px e 1440 × 900 px confirma ausência de overflow horizontal e que os controles primários permanecem visíveis, desobstruídos e utilizáveis em cada etapa |

## 4. Regras de negócio

O produto completo prevê 16 regras: 10 atribuídas à EC e à CLT, ainda sujeitas aos gates jurídicos da seção 8, e 6 regras do produto. Todas são preservadas; o recorte de funcionalidades por release não elimina restrições legais aplicáveis ao diagnóstico ou aos cenários. Não se deve recomendar como viável um cenário sem verificar as restrições aplicáveis de RN-14; a ausência do gerador de escala não dispensa essas verificações nem autoriza afirmar que uma escala foi validada. Parâmetros legais são versionados por vigência junto aos artefatos da aplicação. Uma alteração é disponibilizada por uma nova versão publicada do aplicativo, não por administração de banco de dados.

**Regras legais**

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Os prazos são calculados a partir da data de promulgação (parâmetro). Etapa 1 = promulgação + 60 dias. Etapa 2 = início da Etapa 1 + 12 meses. | EC |
| RN-02 | O limite semanal depende da data de referência: 44 h antes da Etapa 1, 42 h na Etapa 1 e 40 h a partir da Etapa 2. | EC |
| RN-03 | A partir da Etapa 1, cada funcionário tem 2 dias de repouso por semana. Antes dela, tem 1. | EC |
| RN-04 | Domingo é a folga preferencial. No comércio, ao menos 1 folga a cada 3 semanas cai no domingo (N configurável). | EC; Lei 10.101/2000, art. 6º |
| RN-05 | Nenhum cenário pode reduzir o salário mensal de um funcionário. | EC |
| RN-06 | Custo-hora = salário mensal ÷ divisor mensal, onde divisor = jornada semanal × 5 (220, 210, 200). | Prática CLT |
| RN-07 | Com acordo ou convenção coletiva marcado para escala 12x36 ou atividade essencial, o repouso é validado pela média de 2 dias/semana no mês-calendário, não semana a semana. | EC |
| RN-08 | Jornada diária normal de até 8 h. Hora extra de até 2 h/dia, com adicional mínimo de 50%. | CF art. 7º; CLT art. 59 |
| RN-09 | Intervalo mínimo de 11 h entre duas jornadas. | CLT art. 66 |
| RN-10 | Jornada acima de 6 h exige intervalo de 1 h a 2 h. Entre 4 h e 6 h, exige 15 min. | CLT art. 71 |

**Regras do produto**

| ID | Regra |
| --- | --- |
| RN-11 | A escala precisa cobrir o mínimo de pessoas que o usuário define por faixa horária. Faixas descobertas aparecem como déficit em horas-pessoa. |
| RN-12 | Déficit semanal = horas-pessoa exigidas pela cobertura − horas disponíveis da equipe no limite da etapa. |
| RN-13 | O simulador calcula 4 cenários: contratar CLT integral, contratar tempo parcial (até 30 h, CLT art. 58-A), hora extra e reduzir o horário de funcionamento. Custo de contratação = salário × (1 + % de encargos configurável). Custo de hora extra = déficit × custo-hora × 1,5. Redução de horário = perda de receita informada pelo usuário. Valores mensais = valores semanais × 5, o mesmo fator do divisor. |
| RN-14 | Um cenário que viole RN-03, RN-05, RN-08, RN-09 ou RN-10 é inviável e mostra o motivo. A recomendação é o cenário viável de menor custo mensal; no empate, o de menos horas extras. |
| RN-15 | Todo relatório e documento gerado localmente traz o aviso de que não substitui orientação de contador ou advogado. |
| RN-16 | Parâmetros legais têm versão e vigência e são publicados com a aplicação. Alterações entram por uma nova versão do aplicativo; não há administração em banco de dados, recálculo remoto ou envio de notificações. |

## 5. Funcionalidades por release

O produto completo tem 6 módulos. O release inicial entrega F1 com entrada manual (RF-01 a RF-03 e RF-05), F2, F3 e F5. RF-04 (CSV), F4 e F6 ficam para releases posteriores, assim como a persistência local opcional. A tabela mantém todos os requisitos previstos, sem implicar que todos serão entregues em 30 dias. Todos funcionam sem login e processam as premissas e os resultados localmente no navegador.

| Módulo | Requisitos funcionais | Regras |
| --- | --- | --- |
| F1. Premissas de cálculo | RF-01 informar segmento, regime tributário quando necessário ao cálculo e percentual de encargos; não solicitar nome ou CNPJ. RF-02 informar salário, jornada atual e tipo de contrato, usando rótulos anônimos gerados localmente para distinguir pessoas na escala. RF-03 informar o horário de funcionamento e o mínimo de pessoas por faixa. RF-04 importar CSV no navegador, lendo apenas as colunas necessárias e descartando outros campos. RF-05 marcar acordo ou convenção coletiva com exceção. | RN-07, RN-11 |
| F2. Diagnóstico | RF-06 calcular o déficit de horas por etapa. RF-07 calcular o aumento do custo-hora por pessoa e total. RF-08 mostrar as datas das etapas e a versão dos parâmetros legais utilizada. | RN-01, RN-02, RN-06, RN-12, RN-16 |
| F3. Simulador de cenários | RF-09 calcular os 4 cenários lado a lado por etapa. RF-10 marcar cenários inviáveis com o motivo. RF-11 recomendar um cenário. RF-12 permitir ajustar premissas (salário do contratado, perda de receita). | RN-05, RN-08, RN-13, RN-14 |
| F4. Gerador de escala 5x2 | RF-13 gerar escala semanal que cubra a demanda. RF-14 permitir editar a escala manualmente, revalidando a cada mudança. RF-15 gerar localmente e permitir baixar a escala em PDF e imagem. | RN-03, RN-04, RN-08, RN-09, RN-10, RN-11 |
| F5. Linha do tempo e checklist | RF-16 exibir prazos legais e checklist por etapa dentro da ferramenta. | RN-01 |
| F6. Documentos e modelos | RF-17 gerar localmente modelo de comunicado aos funcionários, modelo de aditivo contratual e relatório do diagnóstico em PDF, todos com o aviso legal aplicável. | RN-15 |

**Fluxo principal do release inicial:** abrir ferramenta → informar premissas mínimas manualmente → diagnóstico → comparar cenários e escolher uma opção → consultar linha do tempo/checklist legal. O checklist inicial não depende de geração, edição ou aprovação de uma escala na ferramenta.

**Fluxo ampliado, em releases posteriores:** adicionar importação CSV às premissas, geração/edição de escala após comparar cenários e geração/download de documentos locais.

**Persistência e exclusão:** no release inicial, os dados ficam apenas em memória durante a sessão; recarregar não restaura premissas ou resultados. A persistência opcional no armazenamento local do navegador fica para release posterior e só pode ser entregue junto de uma ação explícita e fácil de localizar para apagar todos os dados locais da ferramenta, inclusive o estado ativo. CSV, cálculos e arquivos gerados nunca são enviados à aplicação, em nenhum release.

## 6. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Motor de regras separado da interface, com parâmetros legais versionados por vigência e publicados junto aos artefatos da aplicação; atualizações por release. |
| RNF-02 | Diagnóstico e simulador respondem em até 2 s para até 50 pessoas no release inicial. Em release posterior, o gerador de escala responde em até 10 s, no navegador. |
| RNF-03 | Interface responsiva, priorizando o celular. O conjunto mínimo de premissas cabe em até 3 telas. |
| RNF-04 | Privacidade e LGPD: não solicitar nome, CNPJ, e-mail ou identificadores de funcionários; não transmitir ou persistir em servidor dados operacionais; não incluir contas, APIs de produto, bancos de dados, telemetria, analytics, pixels ou integrações externas. No release inicial, dados somente em memória durante a sessão, sem restauração após recarregar; persistência opcional somente no navegador em release posterior, com ação explícita para apagar dados locais. Informar que a hospedagem pode processar metadados técnicos de acesso distintos dos dados de cálculo. |
| RNF-05 | Cálculos monetários em JavaScript/TypeScript usam aritmética decimal de base 10, sem depender de ponto flutuante binário. Divisões que resultem em dízimas periódicas mantêm o numerador e o denominador exatos, ou representação racional equivalente, durante todas as operações monetárias subsequentes; não se introduz precisão intermediária arbitrária. O arredondamento bancário (half-even) para 2 casas decimais ocorre somente nos valores finais exibidos e nunca altera os valores usados nos cálculos. |
| RNF-06 | Toda regra aplicável tem ao menos um cenário automatizado em JavaScript/TypeScript (seção 7); todos os cenários de regras são executados em cada pull request. |
| RNF-07 | Fuso horário America/Sao\_Paulo em todos os cálculos de data. |
| RNF-08 | Aplicação implementada em Next.js com TypeScript e publicada na Vercel; a plataforma serve a aplicação, sem serviços de backend para processamento de produto ou dados operacionais. |

## 7. Plano de testes automatizados

As 16 regras e os requisitos RNF-03, RNF-04 e RNF-05 têm 32 definições de cenários automatizados preservadas nas seções 7.1 a 7.11, mais 3 definições específicas do release inicial na seção 7.12 (35 no total), organizadas por requisito em testes compatíveis com JavaScript/TypeScript. Cada esquema conta como uma definição, com todos os seus exemplos executados. Os cenários abaixo são especificações executáveis em Gherkin em português (`# language: pt`) ou testes equivalentes no ecossistema escolhido. Cada teste de regra identifica o requisito que cobre (`RN-xx`); o pipeline falha se alguma regra aplicável ao release ficar sem cobertura. Os testes de privacidade distinguem endpoints da aplicação e origens externas das requisições comuns de assets estáticos e metadados técnicos da hospedagem, que são permitidas e não podem transportar dados operacionais; não pode haver chamadas a serviços ou integrações de terceiros.

**Recorte por release:** no inicial, executar os cenários aplicáveis ao diagnóstico, simulador, parâmetros e prazos (7.1, 7.2, RN-12 em 7.5, 7.6 e 7.9), as validações legais aplicáveis (7.3 e 7.4) e os três cenários do fluxo manual em 7.12. Os testes de regras sobre escalas podem usar fixtures, sem disponibilizar um gerador/editor no release inicial. A validação completa de escala/cobertura de F4, o checklist com escala de 7.7, os documentos de 7.8 e os fluxos ampliados de privacidade e responsividade de 7.10 e 7.11 são preservados para os releases correspondentes, quando passam a ser obrigatórios. A proteção de privacidade e os dois viewports continuam obrigatórios desde o inicial, cobertos por 7.12, sem esperar funcionalidades futuras. Os gates jurídicos bloqueiam a implementação dos cálculos afetados, inclusive resultados esperados que dependam de interpretações ainda não confirmadas.

**Premissas comuns de teste, não confirmação jurídica:** promulgação em 16/10/2026, logo a Etapa 1 começa em 15/12/2026 e a Etapa 2 em 15/12/2027. São fixtures hipotéticas, não prova de promulgação ou aprovação legal; dependem dos gates da seção 8 antes de uso real. O fuso é America/Sao\_Paulo. Os valores estão em reais.

| Conjunto de testes | Regras | Cenários |
| --- | --- | --- |
| prazos.feature | RN-01, RN-02 | 3 |
| custo\_hora.feature | RN-05, RN-06, RNF-05 | 5 |
| repouso.feature | RN-03, RN-04, RN-07 | 7 |
| jornada.feature | RN-08, RN-09, RN-10 | 4 |
| cobertura.feature | RN-11, RN-12 | 2 |
| cenarios.feature | RN-13, RN-14 | 4 |
| linha\_do\_tempo | RN-01, RF-16 | 1 |
| documentos\_exportacao | RN-15 | 1 |
| parametros | RN-16 | 1 |
| privacidade | RNF-04 | 3 |
| responsividade | RNF-03 | 1 |
| fluxo\_inicial (7.12) | RF-16, RNF-03, RNF-04 | 3 |

### 7.1 Prazos e limite semanal

```gherkin
# language: pt
Funcionalidade: Prazos da transição e limite semanal

  @RN-01
  Esquema do Cenário: Calcular as datas das etapas a partir da promulgação
    Dado que a data de promulgação configurada é <promulgacao>
    Quando o sistema calcula a linha do tempo
    Então a Etapa 1 começa em <etapa1>
    E a Etapa 2 começa em <etapa2>

    Exemplos:
      | promulgacao | etapa1     | etapa2     |
      | 16/10/2026  | 15/12/2026 | 15/12/2027 |
      | 20/10/2026  | 19/12/2026 | 19/12/2027 |

  @RN-01
  Cenário: Usar a data de promulgação publicada na versão atualizada
    Dado que a versão atual da ferramenta contém promulgação em 16/10/2026
    Quando uma nova versão publicada contém promulgação em 20/10/2026
    Então a ferramenta atualizada calcula a Etapa 1 para 19/12/2026
    E nenhum dado de cálculo é transmitido para recalcular diagnósticos remotamente

  @RN-02
  Esquema do Cenário: Definir o limite semanal pela data de referência
    Quando o sistema consulta o limite semanal para <data>
    Então o limite é de <limite> horas

    Exemplos:
      | data       | limite |
      | 14/12/2026 | 44     |
      | 15/12/2026 | 42     |
      | 14/12/2027 | 42     |
      | 15/12/2027 | 40     |
```

### 7.2 Custo-hora e irredutibilidade salarial

```gherkin
# language: pt
Funcionalidade: Custo-hora e salário

  @RN-06
  Esquema do Cenário: Calcular o custo-hora pelo divisor da etapa
    Dado um funcionário com salário mensal de R$ 2.200,00
    Quando o custo-hora é calculado para a jornada de <jornada> horas
    Então o divisor é <divisor>
    E o custo-hora é R$ <custo>
    E o aumento sobre a jornada de 44 horas é de <aumento>

    Exemplos:
      | jornada | divisor | custo | aumento |
      | 44      | 220     | 10,00 | 0,00%   |
      | 42      | 210     | 10,48 | 4,76%   |
      | 40      | 200     | 11,00 | 10,00%  |

  @RN-06 @RNF-05
  Cenário: Preservar a fração exata do custo-hora nas horas extras
    Dado um funcionário com salário mensal de R$ 2.200,00 e divisor mensal 210
    Quando o custo de 21 horas extras é calculado com adicional de 50%
    Então o custo-hora exibido é R$ 10,48
    E o custo das horas extras é calculado exatamente como 21 × 1,5 × (2.200 / 210) e resulta em R$ 330,00
    E arredondar o custo-hora para R$ 10,48 antes do cálculo produziria incorretamente R$ 330,12

  @RN-05
  Cenário: Bloquear cenário com redução proporcional de salário
    Dado um funcionário com salário mensal de R$ 2.200,00 e jornada de 44 horas
    Quando o usuário ajusta o salário para R$ 2.000,00 na jornada de 40 horas
    Então o sistema rejeita o ajuste
    E exibe a mensagem "A emenda não permite reduzir salário na redução de jornada"

  @RN-05
  Cenário: Permitir aumento de salário
    Dado um funcionário com salário mensal de R$ 2.200,00
    Quando o usuário ajusta o salário para R$ 2.400,00
    Então o ajuste é aceito

  @RNF-05
  Esquema do Cenário: Preservar a exatidão decimal e arredondar half-even somente na exibição
    Dado um valor monetário de R$ <parcela> representado em decimal de base 10
    Quando o sistema soma R$ 0,005 usando aritmética decimal de base 10, sem ponto flutuante binário
    Então o resultado interno é exatamente R$ <resultado>
    E a exibição com 2 casas decimais e arredondamento bancário (half-even) é R$ <exibicao>
    E multiplicar o resultado interno por 1000 após a exibição produz exatamente R$ <produto>, sem arredondamento intermediário

    Exemplos:
      | parcela | resultado | exibicao | produto |
      | 2,34    | 2,345     | 2,34     | 2345    |
      | 2,35    | 2,355     | 2,36     | 2355    |
```

### 7.3 Repouso semanal, domingo e exceções

```gherkin
# language: pt
Funcionalidade: Repouso semanal remunerado

  @RN-03
  Cenário: Escala com uma folga é válida antes da Etapa 1
    Dado uma escala da semana de 07/12/2026 em que Pessoa 1 folga 1 dia
    Quando a escala é validada
    Então a escala não tem violações de repouso

  @RN-03
  Cenário: Escala com uma folga é inválida a partir da Etapa 1
    Dado uma escala da semana de 21/12/2026 em que Pessoa 1 folga 1 dia
    Quando a escala é validada
    Então a escala tem a violação "Pessoa 1 tem 1 dia de repouso; o mínimo é 2"

  @RN-03
  Cenário: Escala com duas folgas é válida a partir da Etapa 1
    Dado uma escala da semana de 21/12/2026 em que Pessoa 1 folga 2 dias
    Quando a escala é validada
    Então a escala não tem violações de repouso

  @RN-04
  Cenário: Alertar quando um comerciário passa 3 semanas sem folga no domingo
    Dado uma empresa do segmento comércio com N = 3 semanas
    E Pessoa 2 não folga no domingo em 3 semanas consecutivas
    Quando a escala é validada
    Então a escala tem a violação "Pessoa 2 precisa de folga no domingo ao menos 1 vez a cada 3 semanas"

  @RN-04
  Cenário: O gerador alterna as folgas de domingo
    Dado uma empresa do segmento comércio com 3 funcionários
    E a cobertura mínima de domingo é de 2 pessoas
    Quando o sistema gera a escala de 3 semanas
    Então cada funcionário folga em ao menos 1 domingo
    E nenhum domingo tem menos de 2 pessoas

  @RN-07
  Cenário: Validar o repouso pela média mensal quando há acordo coletivo
    Dado uma empresa com acordo coletivo de exceção para escala 12x36
    E Pessoa 3 tem 9 dias de repouso em outubro de 2027, que tem 31 dias
    Mas tem uma semana desse mês com 1 dia de repouso
    Quando a escala do mês é validada
    Então a média de repouso de Pessoa 3 é 2,03 dias por semana
    E a escala não tem violações de repouso

  @RN-07
  Cenário: Média mensal abaixo de 2 dias é inválida mesmo com acordo
    Dado uma empresa com acordo coletivo de exceção para escala 12x36
    E Pessoa 3 tem 8 dias de repouso em outubro de 2027
    Quando a escala do mês é validada
    Então a escala tem a violação "Média de repouso de Pessoa 3 é 1,81 dia por semana; o mínimo é 2"
```

### 7.4 Jornada diária e intervalos

```gherkin
# language: pt
Funcionalidade: Jornada diária e intervalos

  @RN-08
  Esquema do Cenário: Limitar hora extra a 2 horas por dia
    Dado um turno de <horas> horas em um dia
    Quando o turno é validado
    Então o resultado é "<resultado>"

    Exemplos:
      | horas | resultado                                   |
      | 8     | válido                                      |
      | 10    | válido com 2 horas extras                   |
      | 10,5  | inválido: hora extra acima de 2 horas no dia |

  @RN-08
  Cenário: Aplicar o adicional mínimo de 50% na hora extra
    Dado um funcionário com custo-hora de R$ 10,00
    Quando ele faz 2 horas extras
    Então o custo das horas extras é R$ 30,00

  @RN-09
  Esquema do Cenário: Exigir 11 horas entre jornadas
    Dado que Pessoa 4 termina o turno às 23:00 de segunda-feira
    Quando o próximo turno começa às <inicio> de terça-feira
    Então a validação de interjornada é "<resultado>"

    Exemplos:
      | inicio | resultado                         |
      | 09:00  | inválida: 10 horas de intervalo   |
      | 10:00  | válida                            |

  @RN-10
  Esquema do Cenário: Exigir intervalo intrajornada conforme a duração
    Dado um turno de <horas> horas com intervalo de <intervalo> minutos
    Quando o turno é validado
    Então o resultado do intervalo é "<resultado>"

    Exemplos:
      | horas | intervalo | resultado                   |
      | 4     | 0         | válido                      |
      | 5     | 0         | inválido: mínimo de 15 min  |
      | 5     | 15        | válido                      |
      | 8     | 30        | inválido: mínimo de 60 min  |
      | 8     | 60        | válido                      |
```

### 7.5 Cobertura e déficit

```gherkin
# language: pt
Funcionalidade: Cobertura e déficit de horas

  Contexto:
    Dado uma loja que abre de segunda a sábado, das 08:00 às 18:00
    E a cobertura mínima é de 3 pessoas em todas as faixas
    E a equipe tem 4 funcionários em jornada integral

  @RN-12
  Esquema do Cenário: Calcular o déficit semanal por etapa
    Quando o diagnóstico é calculado para a <etapa>
    Então as horas exigidas são 180 horas-pessoa
    E as horas disponíveis são <disponiveis>
    E o déficit é de <deficit> horas-pessoa por semana

    Exemplos:
      | etapa         | disponiveis | deficit |
      | jornada atual | 176         | 4       |
      | Etapa 1       | 168         | 12      |
      | Etapa 2       | 160         | 20      |

  # O déficit da RN-12 é teórico: supõe que qualquer hora disponível cobre qualquer faixa.
  # O total descoberto depende de como os turnos são distribuídos, então a cobertura
  # é verificada sobre uma escala concreta.
  @RN-11
  Cenário: Apontar as faixas descobertas na escala
    Dado a escala de segunda-feira, 21/12/2026:
      | funcionário | início | fim   |
      | Pessoa 1    | 08:00  | 16:00 |
      | Pessoa 2    | 08:00  | 16:00 |
      | Pessoa 3    | 10:00  | 18:00 |
    Quando a cobertura é validada
    Então as faixas descobertas são:
      | dia           | início | fim   | faltam |
      | segunda-feira | 08:00  | 10:00 | 1      |
      | segunda-feira | 16:00  | 18:00 | 2      |
    E a soma das faixas descobertas é de 6 horas-pessoa
```

### 7.6 Simulador de cenários e recomendação

```gherkin
# language: pt
Funcionalidade: Simulador de cenários

  Contexto:
    Dado uma empresa na Etapa 1 com déficit de 12 horas-pessoa por semana
    E 4 funcionários com salário de R$ 2.100,00 e custo-hora de R$ 10,00
    E perda de receita informada de R$ 1.500,00 por mês para redução de horário

  @RN-13 @RN-14
  Cenário: Calcular os quatro cenários e recomendar o mais barato
    Dado encargos de 60%
    Quando o simulador é executado
    Então os custos mensais são:
      | cenário                    | custo mensal |
      | Contratar integral         | 3.360,00     |
      | Contratar parcial (12 h)   | 960,00       |
      | Hora extra                 | 900,00       |
      | Reduzir horário            | 1.500,00     |
    E o cenário recomendado é "Hora extra"

  @RN-14
  Cenário: Desempatar pelo cenário com menos horas extras
    Dado encargos de 50%
    Quando o simulador é executado
    Então "Contratar parcial (12 h)" e "Hora extra" custam R$ 900,00 cada
    E o cenário recomendado é "Contratar parcial (12 h)"

  @RN-14 @RN-08
  Cenário: Marcar hora extra como inviável acima de 2 horas por dia
    Dado uma empresa com 2 funcionários e déficit de 30 horas-pessoa por semana
    Quando o simulador é executado
    Então o cenário "Hora extra" é inviável
    E o motivo é "Exigiria 3 horas extras por dia por funcionário; o limite é 2"
    E o cenário "Hora extra" não pode ser recomendado

  @RN-14 @RN-05
  Cenário: Nenhum cenário recomendado reduz salário
    Quando o simulador é executado
    Então nenhum cenário recomendado tem salário menor que o atual
```

### 7.7 Linha do tempo e checklist

```gherkin
# language: pt
Funcionalidade: Linha do tempo e checklist local

  @RF-16
  Cenário: Exibir prazos e pendências sem enviar notificações
    Dado as datas legais calculadas e uma escala ainda não aprovada
    Quando o usuário abre a linha do tempo
    Então a ferramenta exibe as datas e o item pendente no checklist
    E não envia e-mail, mensagem ou notificação externa
```

### 7.8 Documentos e exportação local

```gherkin
# language: pt
Funcionalidade: Geração e exportação de documentos

  @RN-15
  Cenário: Incluir o aviso legal em documentos exportados
    Quando o usuário exporta o relatório do diagnóstico em PDF
    Então o PDF contém o aviso "Este material não substitui orientação de contador ou advogado"
    E o arquivo é gerado e baixado no navegador sem transmitir premissas
```

### 7.9 Parâmetros versionados

```gherkin
# language: pt
Funcionalidade: Parâmetros legais publicados com a aplicação

  @RN-16
  Cenário: Usar parâmetros versionados incluídos em uma versão publicada
    Dado uma nova versão publicada da aplicação com parâmetros versionados
    E o adicional de hora extra de 50% até 31/12/2026 e de 60% a partir de 01/01/2027
    Quando o usuário calcula um cenário para 15/12/2026 e outro para 01/01/2027
    Então o cenário de 15/12/2026 usa o parâmetro de 50%
    E o cenário de 01/01/2027 usa o parâmetro de 60%
    E os cálculos ocorrem no navegador sem administração de banco de dados ou aviso remoto
```

### 7.10 Privacidade, persistência e exclusão local

```gherkin
# language: pt
Funcionalidade: Fronteira de privacidade e dados locais

  @RNF-04
  Cenário: Processar importação, diagnóstico e exportação sem transmitir dados operacionais
    Dado um CSV com premissas operacionais importado no navegador
    Quando o usuário executa o diagnóstico e gera e baixa uma exportação local
    Então nenhuma requisição a endpoints da aplicação contém premissas, conteúdo do CSV, resultados ou documentos gerados
    E as requisições comuns de assets estáticos e metadados técnicos da hospedagem não são tratadas como dados operacionais

  @RNF-04
  Cenário: Apagar dados ativos e persistidos também após recarregar
    Dado que o usuário optou por persistir premissas e há dados ativos no formulário e no estado da aplicação
    Quando o usuário aciona explicitamente a opção para apagar os dados locais
    Então os dados ativos e todos os dados da ferramenta no armazenamento local são removidos
    E depois de recarregar a aplicação essas premissas e resultados não retornam

  @RNF-04
  Cenário: Não fazer chamadas a serviços ou integrações de terceiros
    Dado que o usuário realiza importação, diagnóstico e exportação local
    Quando o teste observa todas as requisições de rede da aplicação
    Então não há chamadas a serviços ou integrações de terceiros, como analytics, pixels ou widgets
    E somente são permitidas as requisições comuns de assets estáticos e metadados técnicos à hospedagem
    E nenhuma requisição a uma origem externa contém premissas ou resultados operacionais
```

### 7.11 Experiência responsiva

```gherkin
# language: pt
Funcionalidade: Fluxo principal em diferentes tamanhos de tela

  @RNF-03
  Esquema do Cenário: Concluir o fluxo principal sem overflow horizontal
    Dado que a aplicação está aberta em um viewport de <largura> × <altura> px
    Quando o usuário informa as premissas mínimas e consulta o diagnóstico
    E compara os cenários e seleciona uma opção
    E gera e edita uma escala e consulta o checklist
    E gera e inicia o download de um documento local
    Então não há overflow horizontal em nenhuma etapa do fluxo
    E o controle primário de cada etapa está visível, desobstruído e utilizável

    Exemplos:
      | largura | altura |
      | 390     | 844    |
      | 1440    | 900    |
```

### 7.12 Fluxo manual do release inicial

```gherkin
# language: pt
Funcionalidade: Release inicial sem persistência ou funcionalidades posteriores

  @RF-16 @RN-01
  Cenário: Consultar linha do tempo e checklist sem gerar escala
    Dado que o usuário informou premissas manualmente e comparou os cenários
    Quando abre a linha do tempo e o checklist legal
    Então vê prazos por etapa, a versão dos parâmetros e as pendências legais
    E não precisa importar CSV, gerar ou aprovar escala ou exportar documentos
    E não recebe e-mail, mensagem ou notificação externa

  @RNF-04
  Cenário: Processar o fluxo manual sem transmissão ou persistência de dados
    Dado que o usuário informa premissas manuais e consulta diagnóstico, cenários e checklist
    Quando o teste observa todas as requisições e o armazenamento do navegador
    Então nenhuma requisição a endpoints da aplicação ou origens externas contém premissas ou resultados
    E não há chamadas a serviços ou integrações de terceiros, analytics, pixels ou telemetria
    E somente são permitidas requisições comuns de assets estáticos e metadados técnicos à hospedagem, sem dados operacionais
    E premissas e resultados não são persistidos no navegador ou remotamente
    E depois de recarregar a aplicação essas premissas e resultados não retornam

  @RNF-03
  Esquema do Cenário: Concluir o fluxo manual em celular e desktop
    Dado que a aplicação está aberta em um viewport de <largura> × <altura> px
    Quando o usuário informa as premissas manuais e consulta o diagnóstico
    E compara os quatro cenários, seleciona uma opção e consulta linha do tempo e checklist
    Então não há overflow horizontal em nenhuma etapa do fluxo
    E o controle primário de cada etapa está visível, desobstruído e utilizável
    E não precisa importar CSV, persistir dados, gerar ou editar escala ou baixar documentos

    Exemplos:
      | largura | altura |
      | 390     | 844    |
      | 1440    | 900    |
```

## 8. Riscos, roadmap e questões em aberto

O maior risco é o tempo: considerando a data hipotética de 15/12/2026, o valor do produto cai depois do início da Etapa 1. A meta é entregar premissas manuais, diagnóstico, simulador e linha do tempo/checklist legal em até 30 dias, condicionada aos gates jurídicos abaixo; se permanecerem pendentes, o lançamento fica bloqueado, sem presumir aprovação para cumprir o calendário. Outro risco de produto é uma implementação futura introduzir transmissão ou armazenamento remoto de premissas; a arquitetura e os testes devem manter o processamento local.

| Risco | Mitigação |
| --- | --- |
| Lançar depois de a Etapa 1 já ter começado | Priorizar F1 manual, F2, F3 e F5 no release inicial de 30 dias, sem dispensar os gates jurídicos; a Etapa 2 (40 h), se confirmada, mantém a demanda em 2027 |
| Regulamentação ou interpretação diferente da EC | Parâmetros versionados (RN-16), atualização por release e revisão por advogado trabalhista antes do lançamento |
| Sistemas de ponto lançarem recurso parecido | Foco em decisão e simulação para quem não tem RH; a ferramenta não integra com sistemas externos |
| Responsabilização por um cálculo errado | Aviso legal (RN-15), cobertura automatizada de todas as regras e termos de uso revisados |
| Gerador de escala lento em equipes maiores (release posterior) | Limite de 50 pessoas e limite de tempo para o algoritmo executado no navegador |
| Exposição de premissas operacionais | Processamento e persistência opcionais somente no navegador; sem APIs de produto, banco de dados, analytics ou pixels; cenários automatizados verificam ausência de dados operacionais em endpoints da aplicação e origens externas, exclusão de dados ativos e persistidos após recarga e ausência de chamadas a serviços ou integrações de terceiros. Requisições comuns de assets estáticos e metadados técnicos da hospedagem são permitidas, desde que não transportem dados operacionais |

**Roadmap**

1. Release inicial de 30 dias (meta até 15/11/2026): F1 Premissas manuais (RF-01 a RF-03 e RF-05), F2 Diagnóstico, F3 Simulador de quatro cenários e F5 Linha do tempo/checklist legal. Cobertura automatizada das regras aplicáveis (RN-01 a RN-14 e RN-16), exatidão monetária RNF-05 e testes de privacidade e responsividade do fluxo inicial. Sem CSV, persistência local, geração/edição de escala ou exportação de documentos. Implementação dos cálculos afetados e lançamento condicionados aos gates jurídicos.
2. Releases posteriores ao inicial, sem data comprometida: RF-04 Importação CSV no navegador, persistência local opcional com exclusão completa, F4 Geração/edição de escala e respectivas exportações PDF/imagem e F6 Documentos/modelos exportáveis localmente. Ativar os cenários ampliados correspondentes sem remover os testes do fluxo inicial.
3. 2027: atualizar parâmetros legais por releases, ampliar suporte a convenções coletivas por categoria e preparar a ferramenta para a Etapa 2, conforme texto e vigências confirmados.

**Gates jurídicos pendentes — bloqueadores da implementação dos cálculos afetados e do lançamento**

Não há aprovação de advogado fornecida para as fontes ou interpretações legais. Todos os itens abaixo permanecem pendentes; registrar a evidência da confirmação/revisão, o responsável, a data e a versão dos parâmetros antes de encerrar cada gate. As fontes existentes não substituem essa validação, e o aviso legal não libera o lançamento.

- [ ] GJ-01 — Confirmar a data efetiva de promulgação e o texto final publicado no DOU, confrontando os fatos e fontes registrados com a publicação oficial. Bloqueia RN-01 a RN-03 e demais cálculos e prazos dependentes da vigência.
- [ ] GJ-02 — Obter revisão por advogado trabalhista das fontes e interpretações legais registradas, incluindo RN-04, RN-07 e RN-10 e o divisor da RN-06. Bloqueia os cálculos afetados de repouso, intervalos, custo-hora e cenários dependentes; não há aprovação presumida das demais regras legais.
- [ ] GJ-03 — Definir com advogado se 42 h em 5 dias (8h24 por dia) exige acordo de compensação (CLT art. 59, § 2º). A interpretação ainda não confirmada é que, sem ele, os 24 min diários viram hora extra e a RN-12 superestima as horas disponíveis. Bloqueia a implementação dos cálculos afetados de disponibilidade, déficit, horas extras e viabilidade/recomendação dos cenários.
- [ ] GJ-04 — Concluir a revisão jurídica pré-lançamento, incluindo termos de uso, e registrar a aprovação explícita; confirmar que os gates anteriores foram encerrados e os parâmetros e testes refletem as decisões. Enquanto pendente, o lançamento permanece bloqueado.

**Outras questões em aberto**

- [ ] Definir o percentual de encargos padrão por regime tributário com um contador.
- [ ] Em release posterior, escolher o mecanismo de persistência opcional no navegador e garantir que a ação de apagar cubra todos os dados locais da ferramenta; não introduzir persistência no release inicial.
- [ ] Definir como comunicar na interface a versão e a vigência dos parâmetros legais publicados.
