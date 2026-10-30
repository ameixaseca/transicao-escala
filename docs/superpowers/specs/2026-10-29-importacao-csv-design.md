# Design: Importação local de equipe por CSV

## Objetivo

Permitir que a pessoa usuária importe premissas de equipe de um arquivo CSV sem
enviar o arquivo nem suas colunas adicionais para fora do navegador. A importação
é explícita, validada linha a linha e só altera o diagnóstico após confirmação.

## Escopo

- Importar somente salário mensal, horas semanais e tipo de contrato por pessoa.
- Substituir a equipe ativa após confirmação, preservando a data de referência e
  as faixas de cobertura atuais.
- Não importar premissas financeiras de cenários, nem alterar cálculos jurídicos,
  persistência local existente ou estado de lançamento.

## Formato do arquivo

- O arquivo deve ser CSV em UTF-8; BOM UTF-8 é permitido.
- O limite é 5 MiB. A interface verifica `File.size` antes de ler o arquivo.
  Arquivo vazio, acima do limite ou com codificação incompatível é rejeitado
  antes da prévia.
- PapaParse identifica delimitadores CSV usuais, incluindo vírgula e ponto e
  vírgula; valores com delimitadores internos devem seguir as regras de aspas do
  formato CSV. Linhas totalmente vazias são ignoradas.
- Cabeçalhos obrigatórios, após remover espaços nas extremidades, são exatos e
  sensíveis a maiúsculas/minúsculas:
  - `salario_mensal`
  - `horas_semanais`
  - `tipo_contrato`
- Campos numéricos usam o formato brasileiro já aceito pelo formulário, como
  `2.200,50` e `42`. Salário e jornada devem ser maiores que zero.
- `tipo_contrato` aceita somente `full-time` ou `part-time`, removendo espaços
  nas extremidades antes da validação.
- Colunas adicionais, inclusive nomes, e-mails, CNPJ ou IDs, são ignoradas e
  descartadas. Não são exibidas, usadas como identificadores nem incluídas na
  saída normalizada.

## Parser e validação

`decodeCsvBytes(bytes: ArrayBuffer): Result<string, CsvImportError[]>` e
`parseAssumptionsCsv(contents: string): Result<ImportPreview, CsvImportError[]>`
são funções puras e não dependem da interface nem de estado do navegador.
`decodeCsvBytes` usa `TextDecoder("utf-8", { fatal: true })` para rejeitar bytes
UTF-8 inválidos sem substituição silenciosa. O parser também valida o tamanho
UTF-8 do texto recebido para manter seu contrato seguro quando chamado sem a
interface.

- A saída válida contém somente `EmployeeAssumption[]` normalizados. IDs locais
  são gerados pela aplicação; nenhum ID do arquivo é preservado.
- Valores decimais são convertidos com o parser decimal exato existente, sem
  conversão intermediária por ponto flutuante.
- Ao aplicar uma linha normalizada ao formulário, um formatador exato converte
  `Rational` em texto decimal brasileiro sem arredondar. Ele aceita somente
  racionais com representação decimal finita; valores do CSV sempre satisfazem
  essa condição porque foram produzidos pelo parser decimal. A saída não usa
  separador de milhar, remove zeros fracionários finais e omite a vírgula para
  inteiros (por exemplo, `2200,50` torna-se `2200,5`).
- Duplicidade significa igualdade dos três campos obrigatórios após
  normalização: salário, jornada e tipo de contrato. A primeira linha válida é
  mantida; repetições posteriores recebem erro de linha. Colunas identificadoras
  adicionais não participam da deduplicação.
- Erros de codificação, tamanho, cabeçalho ou sintaxe CSV impedem a prévia e
  usam `Result` com falha.
  `row: 0` e `field: "arquivo"` identificam erros que não pertencem a uma linha
  de dados.
- Erros de dados são acumulados em `ImportPreview.errors`, com número do registro
  CSV (cabeçalho na linha 1 e primeira linha de dados na linha 2),
  campo, código estável e mensagem em português. Uma linha inválida não impede a
  análise das demais.
- `ImportPreview.validRows` contém apenas linhas válidas. A aplicação parcial é
  permitida após confirmação; se não houver nenhuma linha válida, a confirmação
  fica indisponível.

## Fluxo da interface

1. A pessoa seleciona um arquivo CSV; a tela verifica o tamanho e decodifica seu
   conteúdo localmente, sem `fetch`, upload ou serviço externo.
2. O componente envia os bytes ao decodificador e somente o texto resultante ao
   parser puro. O conteúdo original e o objeto `File` não são guardados no estado
   da aplicação após a análise; o controle de arquivo é limpo.
3. A prévia apresenta apenas salário, jornada, contrato e erros por linha. As
   colunas adicionais nunca são renderizadas.
4. A pessoa confirma explicitamente a substituição. Com erros parciais, a tela
   informa que somente as linhas válidas serão aplicadas. Sem linhas válidas,
   não há ação de confirmação.
5. Ao aplicar, a lista de equipe ativa é substituída e recebe IDs locais novos.
   Data e cobertura são preservadas; diagnóstico, resultados de cenários e
   verificações dependentes das premissas são invalidados para novo cálculo.
   Salário e jornada são convertidos para os campos de texto por formatação
   decimal exata, sem arredondamento.
6. A importação não salva automaticamente no `localStorage`. A interface informa
   que a equipe importada só será persistida se a pessoa usar o controle explícito
   de salvamento já existente.

Cancelar a prévia ou selecionar outro arquivo não altera as premissas ativas. Um
erro de arquivo é mostrado de forma acessível e não produz confirmação com
aparência de sucesso.

## Privacidade e limites

- Todo parsing e validação acontecem localmente no navegador.
- O texto do arquivo é usado apenas durante a análise e não é persistido.
- Não são adicionados upload, API, sincronização, telemetria ou análise externa.
- O limite de 5 MiB reduz o risco de alocação excessiva de memória no fluxo
  síncrono do navegador.

## Testes e critérios de aceite

### Unitários

- CSV válido com separador vírgula e ponto e vírgula, números brasileiros e
  contratos suportados.
- Formatação exata de `Rational` finito para texto decimal brasileiro e rejeição
  explícita de racionais sem representação decimal finita.
- Cabeçalho ausente, arquivo vazio, acima do limite e bytes com codificação
  incompatível.
- Valores decimais e contratos inválidos, campos ausentes e linhas inválidas
  acumuladas sem perder as linhas válidas.
- Duplicatas após normalização; valores iguais em linhas não duplicadas não são
  comparados com colunas identificadoras.
- Colunas desconhecidas/identificadoras não aparecem nas linhas normalizadas.

### E2E

- Seleção de arquivo, prévia, erros acessíveis, confirmação parcial e
  substituição somente da equipe.
- Data e cobertura permanecem; resultados/checks ficam pendentes até novo
  cálculo.
- Cancelamento mantém as premissas atuais.
- Nenhuma requisição de rede contém conteúdo do arquivo ou valores importados.
- A importação não grava automaticamente no armazenamento local.

O critério de saída da Tarefa 10 é uma importação compreensível, que rejeita
explicitamente linhas inválidas e cujo processamento local é coberto por testes.
