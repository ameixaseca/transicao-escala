# Design: planejador simplificado de escalas

## Objetivo

Permitir que o usuario informe o tamanho da equipe e o funcionamento por dia
para obter rapidamente uma sugestao de escala semanal. A geracao de escalas
e uma nova capacidade do produto, nao uma reorganizacao cosmetica dos
calculos existentes.

Design aprovado no chat em 30/10/2026: tela unica, entradas e resultado lado
a lado no desktop, resultado abaixo das entradas no celular. O usuario
autorizou registrar esta especificacao e o plano antes da implementacao.

## Contexto atual

O fluxo atual pede salario, jornada e contrato por pessoa, faixas de cobertura,
diagnostico, premissas financeiras e verificacoes de cenarios. Todas as secoes
competem pela atencao na mesma pagina.

O dominio existente calcula capacidade, deficit e custos. Ele nao gera uma
escala nem demonstra que a cobertura pode ser atendida respeitando os descansos.
Capacidade agregada suficiente nao comprova a existencia de uma escala.

Os parametros legais do repositorio sao provisorios. GJ-04 permanece como
bloqueador de lancamento. Este trabalho nao altera esse status nem verifica
independentemente as fontes juridicas.

## Alternativas consideradas

1. **Tela unica, escolhida:** formulario compacto e resultado juntos. Facilita
   ajustes e comparacao; em telas pequenas, os blocos ficam empilhados.
2. **Tres passos:** equipe, funcionamento e resultado. Reduz informacao por
   etapa, mas adiciona navegacao para corrigir premissas.
3. **Conversa:** uma pergunta por vez. Acolhedora no primeiro uso, porem lenta
   para revisar os sete dias e comparar configuracoes.

Um esboco visual local foi apresentado e a alternativa 1 foi aprovada.
Os dados e horarios do esboco sao ilustrativos, nao resultados calculados.

## Fluxo principal

1. Informar quantidade de funcionarios.
2. Conferir semana de referencia e jornada-alvo.
3. Informar funcionamento e cobertura minima por dia.
4. Acionar **Gerar escala**.
5. Examinar grade semanal, horas por pessoa, cobertura e pendencias.
6. Ajustar as entradas e gerar novamente quando necessario.

Nao exigir cadastro, nomes, salarios, importacao ou declaracoes de conformidade
para iniciar uma simulacao.

## Entradas

### Equipe

- Quantidade inteira e positiva de funcionarios.
- Identificadores locais neutros, como Pessoa 1 e Pessoa 2.
- Mesma disponibilidade e mesmo limite de jornada para toda a equipe.
- A quantidade informada e a equipe disponivel, nao a cobertura minima.
- A jornada-alvo representa um teto de trabalho efetivo, nao uma obrigacao
  de preencher todas as horas disponiveis.

### Semana e jornada

- Semana de referencia apresentada explicitamente ao usuario.
- Padrao conservador de ate 40 horas semanais, sem horas extras.
- Nao gerar automaticamente 42 horas em cinco dias ou presumir instrumento
  coletivo aplicavel.
- Exibir o limite efetivamente utilizado e a natureza provisoria dos
  parametros. Nao apresentar a simulacao conservadora de 40 horas como
  afirmacao de que esse e o limite juridico vigente na data selecionada.
- Reutilizar os utilitarios existentes de datas e semana de transicao.

### Funcionamento

Sete linhas, de segunda a domingo, cada uma com:

- Aberto ou fechado.
- Horario de abertura e fechamento.
- Minimo inteiro e positivo de pessoas trabalhando simultaneamente.

Uma acao permite copiar os horarios e a cobertura entre dias escolhidos.
Dia fechado nao possui demanda de cobertura.

Nesta primeira versao ha uma faixa continua de funcionamento por dia, sem
atravessar a meia-noite. O sistema explica essa restricao quando necessario,
em vez de truncar ou converter horarios silenciosamente.

## Resultado

### Grade semanal

- Uma linha por pessoa e uma coluna por dia.
- Inicio, fim e intervalos discriminados nos dias de trabalho.
- Folgas explicitamente identificadas.
- Total de horas efetivas por pessoa, descontados os intervalos.
- Informacao compreensivel sem depender apenas de cores.
- Apresentacao acessivel no celular, sem comprimir os horarios ate ficarem
  ilegibles.

### Cobertura

Contar apenas pessoas efetivamente trabalhando em cada faixa. Intervalos
retiram a pessoa da cobertura. Verificar os pontos de mudanca de demanda,
inicio/fim de trabalho e inicio/fim de intervalo.

Separar os estados:

- **Sugestao encontrada:** ha uma escala que passa pelas verificacoes
  implementadas e atende a demanda informada.
- **Cobertura parcial:** mostrar explicitamente dia, faixa e quantidade
  descoberta; nao chamar a escala de completa ou aprovada.
- **Busca sem solucao encontrada:** informar a limitacao da busca; isso nao
  demonstra impossibilidade matematica.
- **Entrada invalida ou nao suportada:** explicar o problema e como corrigi-lo.

Uma estimativa de funcionarios adicionais, quando exibida, deve identificar
seu metodo e limitacoes. Um limite inferior calculado com horas agregadas nao
e uma garantia de que contratar essa quantidade resolve a escala.

### Atualizacao

Alterar entradas torna o resultado anterior desatualizado. Nao manter um
indicador de cobertura atendida como se correspondesse aos dados novos.
Disponibilizar novamente a acao Gerar escala e comunicar a necessidade de
recalculo de modo acessivel.

## Verificacoes e limites de conformidade

A primeira entrega e uma simulacao de jornada comum diurna, sem regimes
especiais, horas extras ou compensacao coletiva presumida.

O gerador deve observar as regras modeladas e um verificador independente
deve conferir o resultado antes de apresenta-lo como sugestao encontrada:

- Teto diario normal conservador de 8 horas efetivas.
- Teto semanal de ate 40 horas, respeitando o alvo informado.
- Ate cinco dias trabalhados e ao menos dois dias de folga na semana.
- Intervalos conforme duracao efetiva e premissas registradas no projeto:
  ate 4 horas sem intervalo obrigatorio; acima de 4 ate 6 horas, 15 minutos;
  acima de 6 horas, 1 hora, sem presumir excecoes coletivas.
- Descanso interjornada e duracao continua dos repousos conforme as regras
  documentadas no projeto.

Nao presumir que duas celulas marcadas como folga comprovam todos os
descansos. Verificar duracoes com os horarios efetivos.

Limites que dependem de historico externo a semana, rodizio de domingos,
feriados, categoria profissional ou instrumentos coletivos aparecem como
pendencias explicitas. Nao transformar ausencia de dados em aprovacao.

Escalas que violem regras verificadas nao podem receber status de sugestao
encontrada. A interface distingue cobertura operacional de validacao juridica.
Mesmo uma sugestao com cobertura completa nao recebe selo de conformidade
legal integral.

## Hierarquia visual

- Titulo orientado a tarefa: montar a escala.
- Formulario de equipe e funcionamento como unica entrada principal.
- Uma acao primaria: Gerar escala.
- Resultado semanal em destaque; resumo de equipe, cobertura e eventual
  estimativa de contratacao apenas quando houver dados calculados.
- Aviso curto e visivel de simulacao com parametros provisorios.
- Premissas detalhadas e pendencias em area expansivel, sem esconder erros
  ou violacoes que afetem o resultado.
- Custos, CSV, persistencia e diagnostico existentes acessiveis numa area
  secundaria, sem bloquear o fluxo principal.

Preservar o fluxo detalhado existente como ferramenta secundaria. Nao
converter dados heterogeneos de funcionarios importados em uma equipe
homogenea silenciosamente. O novo fluxo nao exige salarios ficticios para
reutilizar calculos que dependam de remuneracao.

## Arquitetura e dados

- Dominio de escala separado de custos e diagnostico: entradas operacionais,
  geracao e verificacao de uma escala.
- Gerador separado do verificador para que a busca nao seja a unica prova
  de validade do resultado.
- Estado do formulario e apresentacao na camada de interface.
- Reutilizar datas, parametros e padroes de validacao pertinentes, sem
  acoplar o novo fluxo a salarios ou estados manuais de verificacao.
- Processamento integral no navegador, sem novos servicos, telemetria,
  transmissao de dados ou dependencias externas de otimizacao.
- Busca limitada e comportamento deterministico para as mesmas entradas.
  Esgotamento da busca deve ser explicitamente distinguido de
  impossibilidade comprovada; nao bloquear indefinidamente a interface.
- A persistencia atual continua funcionando no fluxo existente. Persistencia
  de novos dados do planejador nao e requisito desta primeira entrega e nao
  deve sobrescrever o formato salvo existente.

## Erros e acessibilidade

- Validar antes da geracao, com mensagens associadas aos campos.
- Reutilizar o padrao de resumo de erros existente.
- Rejeitar quantidades fracionarias, negativas ou invalidas e horarios
  inconsistentes, sem correcao silenciosa.
- Distinguir falha de execucao, entrada nao suportada, busca esgotada e
  cobertura insuficiente.
- Formularios navegaveis por teclado, labels explicitos, status acessiveis
  e foco coerente apos validacao ou geracao.
- Nao esconder valores padrao que afetem a interpretacao da escala.

## Fora de escopo

- Restricoes individuais, disponibilidades diferentes ou multiplos contratos.
- Categorias especiais, trabalho noturno e operacao atravessando meia-noite.
- Edicao manual da grade, arrastar turnos ou exportar documentos.
- Otimizacao financeira ou garantia da menor equipe possivel.
- Certificacao juridica integral, novos pareceres ou fechamento do GJ-04.
- Remocao das ferramentas atuais ou migracao automatica dos dados salvos.

## Validacao e criterios de aceite

Testes unitarios de validacao, geracao e verificacao devem cobrir:

- Equipe suficiente e demanda atendida em todos os segmentos.
- Intervalos descontados tanto das horas efetivas quanto da cobertura.
- Limites diarios e semanais e dois dias de folga.
- Descansos com duracoes efetivas, incluindo limites da semana tratados
  explicitamente como verificados ou pendentes conforme os dados.
- Equipe insuficiente e faixas descobertas identificadas.
- Demanda nula, entradas invalidas e horarios nao suportados.
- Busca limitada, determinismo e ausencia de falsa prova de impossibilidade.
- Estimativa de contratacao sem promessa de suficiencia nao demonstrada.

Testes de componentes e de fluxo devem cobrir:

- Comecar sem cadastrar salarios ou funcionarios individualmente.
- Preencher funcionamento por dia e copiar horarios.
- Gerar, ler intervalos/folgas e identificar cobertura e pendencias.
- Alterar entradas e invalidar o resultado anterior.
- Erros acessiveis e uso por teclado.
- Layout desktop e celular.
- Acesso ao fluxo detalhado, sem regressao de CSV, persistencia e custos.

Executar os testes pertinentes, verificacao de tipos e build existentes.
Atualizar a documentacao de produto diretamente afetada para distinguir
este novo escopo do release inicial historico.

## Proximo passo

Revisao desta especificacao pelo usuario, seguida de plano de implementacao.
Nenhum codigo de produto foi alterado nesta etapa de design.
