# Importação local de equipe por CSV — Plano de implementação

> **Para agentes de implementação:** execute as tarefas uma a uma, com TDD e revisão entre tarefas. As caixas de seleção acompanham o progresso.

**Objetivo:** permitir substituir a equipe ativa a partir de um CSV local, com prévia, validação por linha e confirmação explícita, sem enviar nem persistir o arquivo.

**Arquitetura:** um formatador decimal exato converte os `Rational` normalizados de volta para valores editáveis. Um módulo puro decodifica bytes UTF-8 e usa PapaParse para validar os registros. Um componente de importação mantém somente a prévia normalizada e integra a confirmação ao formulário existente, preservando data/cobertura e invalidando cálculos dependentes.

**Stack:** Next.js App Router, React, TypeScript, PapaParse, Vitest, React Testing Library e Playwright.

## Restrições globais

- O CSV é UTF-8; BOM UTF-8 é permitido.
- A interface verifica o tamanho de `File.size` antes da leitura e rejeita arquivos acima de 5 MiB.
- Os cabeçalhos obrigatórios exatos são `salario_mensal`, `horas_semanais` e `tipo_contrato`, após remover espaços nas extremidades; são sensíveis a maiúsculas/minúsculas.
- Salário e jornada usam o formato decimal brasileiro existente e devem ser maiores que zero.
- `tipo_contrato` aceita somente `full-time` ou `part-time`.
- Colunas adicionais são ignoradas, descartadas e não são exibidas nem usadas como identificadores.
- Duplicidade significa igualdade normalizada de salário, jornada e tipo de contrato; a primeira linha válida é mantida e repetições posteriores são erros.
- Erros de linha são exibidos; linhas válidas só são aplicadas depois de confirmação explícita. Sem linhas válidas, a confirmação fica indisponível.
- A importação substitui somente a equipe; preserva data/cobertura e invalida diagnóstico, resultados de cenários e verificações dependentes das premissas.
- A importação não salva automaticamente no `localStorage`; o usuário precisa usar o salvamento explícito existente.
- Arquivo e valores importados não podem ser enviados por rede nem enviados a serviço externo.
- Não alterar cálculos jurídicos, estado de lançamento ou o bloqueio de release GJ-04/aprovação jurídica.

---

## Mapa de arquivos

- Modificar `src/domain/money/decimal.ts`: acrescentar conversão exata de `Rational` para decimal finito, sem arredondamento.
- Criar `tests/unit/decimal.test.ts`: testar a nova conversão.
- Adicionar `papaparse` em `dependencies` e `@types/papaparse` em `devDependencies`, atualizando `package-lock.json`.
- Criar `src/features/import/parse-assumptions-csv.ts`: tipos da prévia/erros, decoder UTF-8 estrito e parser puro.
- Criar `tests/unit/parse-assumptions-csv.test.ts`: formatos, validação por linha, duplicidade, limite e privacidade dos dados extra.
- Criar `src/features/import/csv-import.tsx`: seletor de arquivo, prévia acessível, erros e confirmação.
- Modificar `src/app/diagnostico/page.tsx`: aplicar a equipe confirmada por meio de `handleDiagnosticChange`, sem gravar automaticamente.
- Criar `tests/components/csv-import.test.tsx`: estados e confirmação do componente com arquivos reais em memória.
- Modificar `tests/components/diagnostico-page.test.tsx`: integração da substituição e preservação da data/cobertura.
- Criar `tests/e2e/csv-import.spec.ts` antes da integração: regressões do fluxo de navegador, persistência opt-in e ausência de upload.
- Modificar `docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md`: marcar somente os requisitos da Tarefa 10 comprovados.

---

## Tarefa 1: Formatar racionais decimais sem perda

**Arquivos:**
- Modificar: `src/domain/money/decimal.ts`
- Criar: `tests/unit/decimal.test.ts`

**Interfaces:**
- Consome `Rational` de `src/domain/money/rational.ts`.
- Produz `formatDecimal(value: Rational): string`.
- O resultado usa vírgula decimal, sem separador de milhar, sem zeros fracionários finais e sem arredondamento. Um racional sem representação decimal finita lança `RangeError`.

- [ ] **Passo 1: Escrever testes que definam a formatação exata**

```typescript
import { describe, expect, it } from "vitest";
import { formatDecimal } from "@/domain/money/decimal";

describe("formatDecimal", () => {
  it("formats finite decimal rationals without rounding", () => {
    expect(formatDecimal({ numerator: 4401n, denominator: 2n })).toBe("2200,5");
    expect(formatDecimal({ numerator: 171n, denominator: 4n })).toBe("42,75");
    expect(formatDecimal({ numerator: 1n, denominator: 8n })).toBe("0,125");
  });

  it("omits the decimal separator for integers and preserves a negative sign", () => {
    expect(formatDecimal({ numerator: 42n, denominator: 1n })).toBe("42");
    expect(formatDecimal({ numerator: -5n, denominator: 2n })).toBe("-2,5");
  });

  it("rejects a rational with a non-terminating decimal expansion", () => {
    expect(() => formatDecimal({ numerator: 1n, denominator: 3n })).toThrow(
      RangeError,
    );
  });
});
```

- [ ] **Passo 2: Executar os testes antes da implementação**

Executar:

```powershell
npm test -- --run tests/unit/decimal.test.ts
```

Esperado: falha porque `formatDecimal` ainda não está exportada.

- [ ] **Passo 3: Implementar a conversão decimal finita**

Acrescentar em `src/domain/money/decimal.ts`, mantendo os imports já existentes:

```typescript
export function formatDecimal(value: Rational): string {
  const normalized = normalizeRational(value);
  let denominator = normalized.denominator;
  let twos = 0;
  let fives = 0;

  while (denominator % BigInt(2) === BigInt(0)) {
    denominator /= BigInt(2);
    twos += 1;
  }
  while (denominator % BigInt(5) === BigInt(0)) {
    denominator /= BigInt(5);
    fives += 1;
  }
  if (denominator !== BigInt(1)) {
    throw new RangeError("Rational has no finite decimal representation.");
  }

  const scale = Math.max(twos, fives);
  const multiplier =
    BigInt(2) ** BigInt(scale - twos) *
    BigInt(5) ** BigInt(scale - fives);
  const scaled = normalized.numerator * multiplier;
  const negative = scaled < BigInt(0);
  const digits = (negative ? -scaled : scaled)
    .toString()
    .padStart(scale + 1, "0");

  if (scale === 0) return `${negative ? "-" : ""}${digits}`;

  const integer = digits.slice(0, -scale);
  const fraction = digits.slice(-scale).replace(/0+$/, "");
  return `${negative ? "-" : ""}${integer}${
    fraction ? `,${fraction}` : ""
  }`;
}
```

- [ ] **Passo 4: Executar os testes focados**

Executar:

```powershell
npm test -- --run tests/unit/decimal.test.ts
```

Esperado: 3 testes aprovados, cobrindo valores inteiros, negativos, subunidades e rejeição de `1/3`.

- [ ] **Passo 5: Revisar e commitar a unidade**

Executar `git diff --check`, revisar o diff e commitar somente os dois arquivos:

```powershell
git add src/domain/money/decimal.ts tests/unit/decimal.test.ts
git commit -m "feat(money): format exact decimal rationals" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Tarefa 2: Decodificar e validar o CSV localmente

**Arquivos:**
- Modificar: `package.json`, `package-lock.json`
- Criar: `src/features/import/parse-assumptions-csv.ts`
- Criar: `tests/unit/parse-assumptions-csv.test.ts`

**Interfaces:**
- Consome `EmployeeAssumption`, `Rational`, `parseDecimal` e `Result`.
- Produz:

```typescript
export type CsvImportError = {
  row: number;
  field: string;
  code: string;
  message: string;
};

export type ImportPreview = {
  validRows: EmployeeAssumption[];
  errors: CsvImportError[];
};

export function decodeCsvBytes(
  bytes: ArrayBuffer,
): Result<string, CsvImportError[]>;

export function parseAssumptionsCsv(
  contents: string,
): Result<ImportPreview, CsvImportError[]>;
```

- [ ] **Passo 1: Adicionar o parser e seus tipos TypeScript**

Executar:

```powershell
npm install papaparse
npm install --save-dev @types/papaparse
```

Esperado: `package.json` e `package-lock.json` incluem PapaParse como dependência de runtime e seus tipos como dependência de desenvolvimento.

- [ ] **Passo 2: Escrever testes unitários de decoder e parser**

Criar testes para cada comportamento abaixo, sem mocks de PapaParse:

Criar testes explícitos para UTF-8/BOM, bytes inválidos, os dois delimitadores,
arquivo estruturalmente inválido, erros parciais, valores inválidos, duplicatas e
colunas extras. O teste-base deve usar código real:

```typescript
import { describe, expect, it } from "vitest";
import {
  decodeCsvBytes,
  parseAssumptionsCsv,
} from "@/features/import/parse-assumptions-csv";

describe("CSV decoding", () => {
  it("decodes UTF-8 and accepts a UTF-8 BOM", async () => {
    const bytes = new TextEncoder().encode(
      "\uFEFFsalario_mensal;horas_semanais;tipo_contrato\n2.200,50;42;full-time",
    );
    const decoded = decodeCsvBytes(await new Blob([bytes]).arrayBuffer());
    expect(decoded).toEqual({
      ok: true,
      value:
        "salario_mensal;horas_semanais;tipo_contrato\n2.200,50;42;full-time",
    });
  });

  it("rejects invalid UTF-8 bytes", async () => {
    const decoded = decodeCsvBytes(
      await new Blob([Uint8Array.of(0xff)]).arrayBuffer(),
    );
    expect(decoded).toMatchObject({
      ok: false,
      error: [{ row: 0, field: "arquivo", code: "invalid-encoding" }],
    });
  });
});

describe("parseAssumptionsCsv", () => {
  it("parses Brazilian decimals with semicolon and quoted comma delimiters", () => {
    const semicolon = parseAssumptionsCsv(
      "salario_mensal;horas_semanais;tipo_contrato\n2.200,50;42;full-time",
    );
    const comma = parseAssumptionsCsv(
      'salario_mensal,horas_semanais,tipo_contrato\n"2.200,50",42,full-time',
    );

    expect(semicolon).toEqual({
      ok: true,
      value: {
        validRows: [
          {
            localId: "csv-row-2",
            salary: { numerator: 4401n, denominator: 2n },
            weeklyHours: { numerator: 42n, denominator: 1n },
            contractType: "full-time",
          },
        ],
        errors: [],
      },
    });
    expect(comma).toEqual(semicolon);
  });

  it("keeps valid rows and reports invalid fields with CSV record numbers", () => {
    const parsed = parseAssumptionsCsv(
      "salario_mensal;horas_semanais;tipo_contrato\n2.200,50;42;full-time\ninválido;40;part-time",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("Expected a row-level preview.");
    expect(parsed.value.validRows).toHaveLength(1);
    expect(parsed.value.errors).toContainEqual({
      row: 3,
      field: "salario_mensal",
      code: "invalid-decimal",
      message: expect.any(String),
    });
  });

  it("drops extra identifier columns and reports later normalized duplicates", () => {
    const parsed = parseAssumptionsCsv(
      "salario_mensal;horas_semanais;tipo_contrato;email\n2.200,50;42;full-time;nome-secreto@example.test\n2200,5;42;full-time;outro@example.test",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("Expected a row-level preview.");
    expect(parsed.value.validRows).toHaveLength(1);
    expect(parsed.value.validRows[0]).not.toHaveProperty("email");
    expect(parsed.value.errors).toContainEqual({
      row: 3,
      field: "registro",
      code: "duplicate-row",
      message: expect.any(String),
    });
  });
});
```

Adicionar ainda casos exatos para: entrada vazia; cabeçalho ausente; cabeçalho
duplicado; aspas CSV malformadas; texto acima de 5 MiB; salário/jornada vazios,
inválidos ou não positivos; aceitação de `part-time`; contrato não suportado; e
verificação de que `nome-secreto@example.test` não está na saída normalizada.
Cada falha de arquivo deve usar `row: 0` e `field: "arquivo"`.

Asserções obrigatórias:

- Uma linha `2.200,50;42;full-time` produz salário `{ numerator: 4401n, denominator: 2n }`, jornada `{ numerator: 42n, denominator: 1n }` e `contractType: "full-time"`.
- A primeira linha de dados tem `row: 2`; erros de arquivo usam `row: 0` e `field: "arquivo"`.
- Campo numérico vazio ou inválido, salário/jornada menor ou igual a zero e contrato não suportado produzem erro de linha; outras linhas válidas permanecem em `validRows`.
- Formatações equivalentes como `2.200,50` e `2200,5`, com o mesmo contrato e jornada, são duplicatas normalizadas.
- Uma coluna extra contendo `nome-secreto@example.test` não aparece em `validRows`.
- `new TextEncoder().encode("x".repeat(5 * 1024 * 1024 + 1))` excede o limite e falha antes de analisar registros.
- A representação JSON das linhas normalizadas não contém `nome-secreto@example.test`.

- [ ] **Passo 3: Executar os testes e confirmar RED**

Executar:

```powershell
npm test -- --run tests/unit/parse-assumptions-csv.test.ts
```

Esperado: falha porque `parse-assumptions-csv.ts` e suas funções ainda não existem; não aceitar falha por erro de sintaxe nos testes.

- [ ] **Passo 4: Implementar decoder e parser puros**

Em `parse-assumptions-csv.ts`:

1. Importar `Papa` de `papaparse`, `parseDecimal`, os tipos de `EmployeeAssumption`, `Rational` e `Result`.
2. Definir `MAX_CSV_BYTES = 5 * 1024 * 1024` e `REQUIRED_HEADERS = ["salario_mensal", "horas_semanais", "tipo_contrato"] as const`.
3. Implementar `decodeCsvBytes` com `new TextDecoder("utf-8", { fatal: true }).decode(bytes)`. Converter somente `TypeError` de decodificação em erro `invalid-encoding`; relançar outros erros.
4. Em `parseAssumptionsCsv`, verificar tamanho UTF-8 por `new TextEncoder().encode(contents).byteLength`, rejeitar texto vazio e executar `Papa.parse<string[]>(contents, { header: false, dynamicTyping: false, skipEmptyLines: "greedy" })`.
5. Se PapaParse reportar erro de sintaxe, se não houver cabeçalho, se houver cabeçalho duplicado após `trim()` ou se faltar qualquer cabeçalho obrigatório, retornar `{ ok: false, error: [{ row: 0, field: "arquivo", code, message }] }`. Não devolver linha parcialmente válida para arquivo estruturalmente inválido.
6. Mapear índices somente dos três cabeçalhos obrigatórios; jamais copiar as outras células.
7. Para cada registro a partir do índice 1, usar número `index + 1` como `row`, aplicar `trim()` aos campos e acumular erros. `parseDecimal` só é capturado quando lança `SyntaxError`; relançar erros inesperados. Rejeitar numerador menor ou igual a zero. Aceitar somente `full-time`/`part-time`.
8. Para linhas sem erros, criar uma chave de duplicidade a partir dos numeradores/denominadores normalizados de salário e jornada, mais o contrato. Repetição posterior recebe erro e não entra em `validRows`.
9. Criar cada `EmployeeAssumption` válido com `localId: \`csv-row-${row}\``; retornar sucesso com `validRows` e todos os erros de linha, mesmo quando alguns registros falharem.

- [ ] **Passo 5: Executar os testes do parser**

Executar:

```powershell
npm test -- --run tests/unit/decimal.test.ts tests/unit/parse-assumptions-csv.test.ts
```

Esperado: todas as asserções de decimal, UTF-8, delimitadores, cabeçalhos, linhas parciais, duplicatas e descarte de colunas extras passam.

- [ ] **Passo 6: Revisar e commitar a camada pura**

Executar `git diff --check`, verificar que apenas os três campos obrigatórios chegam à saída e commitar:

```powershell
git add package.json package-lock.json src/features/import/parse-assumptions-csv.ts tests/unit/parse-assumptions-csv.test.ts
git commit -m "feat(import): parse employee assumptions from local CSV" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Tarefa 3: Criar prévia acessível e integrar ao diagnóstico

**Arquivos:**
- Criar: `src/features/import/csv-import.tsx`
- Criar: `tests/components/csv-import.test.tsx`
- Criar: `tests/e2e/csv-import.spec.ts`
- Modificar: `src/app/diagnostico/page.tsx`
- Modificar: `tests/components/diagnostico-page.test.tsx`

**Interfaces:**
- `CsvImport` recebe `onImport(rows: EmployeeAssumption[]): void`.
- A página converte `salary` e `weeklyHours` com `formatDecimal`, mantém `localId`/`contractType` gerados e passa as premissas por `handleDiagnosticChange`.

- [ ] **Passo 1: Escrever testes de componente antes da implementação**

Criar os testes abaixo com arquivos `File` reais em memória, sem mock do parser:

1. Selecionar um CSV válido com coluna extra `email`; esperar a tabela nomeada
   `Prévia da equipe`, verificar que `nome-secreto@example.test` não aparece e
   que `onImport` não foi chamado; clicar em `Aplicar linhas válidas` e verificar
   que é chamado uma vez com uma linha normalizada.
2. Selecionar CSV com uma linha válida e uma inválida; aguardar `role="alert"`,
   verificar que `onImport` ainda não foi chamado, confirmar e verificar que só
   uma linha válida é passada.
3. Selecionar CSV válido, clicar em `Cancelar prévia`, verificar que a tabela
   desaparece e `onImport` permanece sem chamadas.
4. Selecionar um `File` de 5 MiB + 1 byte e verificar que `role="alert"` informa
   o limite, `File.arrayBuffer()` não é chamado e `onImport` permanece sem
   chamadas.
5. Selecionar bytes UTF-8 inválidos e CSV com aspas malformadas; cada arquivo
   deve produzir erro acessível e nenhum deve chamar `onImport`.

Usar `role="alert"` para erro e nome acessível `Prévia da equipe` para a tabela.
O botão de aplicação fica desabilitado sem linhas válidas; estados de
leitura/prévia usam regiões acessíveis.

- [ ] **Passo 2: Rodar os testes de componente e confirmar RED**

Executar:

```powershell
npm test -- --run tests/components/csv-import.test.tsx
```

Esperado: falha porque `csv-import.tsx` ainda não existe.

- [ ] **Passo 3: Escrever o E2E de privacidade antes da interface**

Criar `tests/e2e/csv-import.spec.ts` com estes três fluxos:

1. Arquivo válido com duas linhas e uma coluna extra `email`: a equipe não muda
   antes da confirmação; depois, são importadas somente as duas pessoas, a data
   e cobertura continuam iguais e os resultados ficam pendentes.
2. Arquivo com uma linha válida e uma inválida: a prévia exibe o erro e só a
   linha válida é aplicada após confirmar; cancelar outra prévia mantém a equipe.
3. Capturar requisições antes de selecionar o arquivo e verificar que CSV,
   e-mail e valores importados não aparecem em URL, corpo ou versão codificada;
   verificar também que o estado `transicao-escala:assumptions` não é gravado ou
   alterado automaticamente.

No fluxo de privacidade, usar um CSV fixture determinístico com o marcador
`nome-secreto@example.test`; verificar same-origin e requests externos. O teste
deve afirmar que as requisições capturadas não contêm o marcador nem os valores
do CSV, em texto ou `encodeURIComponent`, e que selecionar/aplicar o arquivo não
gera requisição de upload (POST).

- [ ] **Passo 4: Executar o E2E focado e confirmar RED**

Executar:

```powershell
npm run test:e2e -- csv-import.spec.ts
```

Esperado: falha ao localizar `Arquivo CSV da equipe`, porque ainda não existe
componente de importação; a inicialização do servidor/build deve funcionar.

- [ ] **Passo 5: Implementar o componente de importação**

Implementar o seguinte fluxo no componente:

```typescript
type CsvImportProps = {
  onImport: (rows: EmployeeAssumption[]) => void;
};

// Ao selecionar:
// 1. limpar preview/erro anterior e zerar input.value;
// 2. rejeitar file.size > MAX_CSV_BYTES antes de chamar arrayBuffer();
// 3. decodificar com decodeCsvBytes e analisar com parseAssumptionsCsv;
// 4. guardar somente ImportPreview ou CsvImportError[] no estado.
//
// Ao confirmar:
// 1. retornar sem efeito se validRows.length === 0;
// 2. chamar onImport(validRows);
// 3. limpar preview e anunciar que a equipe importada ainda não foi salva.
```

Renderizar um `input type="file"` com rótulo acessível `Arquivo CSV da equipe` e
`accept=".csv,text/csv"`, prévia tabular com nome acessível `Prévia da equipe`,
colunas somente de salário/jornada/contrato, lista de erros por registro/campo,
botões `Aplicar linhas válidas` e `Cancelar prévia`. Erros conhecidos devem
aparecer em `role="alert"`; se `File.arrayBuffer()` rejeitar com
`DOMException` `NotReadableError`, exibir uma mensagem de leitura acessível e
manter o formulário ativo. Não ocultar falhas nem exibir sucesso antes da
confirmação.

- [ ] **Passo 6: Implementar integração com `DiagnosticPage`**

Criar `handleImportEmployees` para mapear cada linha:

```typescript
const handleImportEmployees = (employees: EmployeeAssumption[]) => {
  const importedEmployees = employees.map((employee) => ({
    localId: employee.localId,
    salary: formatDecimal(employee.salary),
    weeklyHours: formatDecimal(employee.weeklyHours),
    contractType: employee.contractType,
  }));

  handleDiagnosticChange({ ...values, employees: importedEmployees });
  setStorageStatusMessage(null);
};
```

Montar `<CsvImport onImport={handleImportEmployees} />` na seção `Premissas`. Reusar `handleDiagnosticChange` para limpar diagnóstico, erros, verificações e resultados de cenários; não chamar `saveLocalAssumptions`. Não alterar `referenceDate`, `coverage`, checklist ou premissas financeiras de cenários.

- [ ] **Passo 7: Adicionar teste de integração da página**

Selecionar um CSV de duas pessoas, confirmar e verificar:

- salários/jornadas aparecem como texto decimal exato (`2.200,50` vira `2200,5`; `42,75` permanece exato);
- a data de referência e horários/faixas de cobertura permanecem;
- diagnóstico/resultados ficam pendentes e checks são reiniciados;
- um registro preexistente em `transicao-escala:assumptions` não muda durante a importação;
- o status anterior de salvamento não afirma que as novas premissas foram salvas.

- [ ] **Passo 8: Rodar testes unitários, de componente e E2E focado**

Executar:

```powershell
npm test -- --run tests/unit/decimal.test.ts tests/unit/parse-assumptions-csv.test.ts
npm test -- --run tests/components/csv-import.test.tsx tests/components/diagnostico-page.test.tsx
npm run test:e2e -- csv-import.spec.ts
```

Esperado: todos os casos do parser, prévia, cancelamento, substituição e
privacidade passam; ajustes de timeout ficam restritos aos testes complexos que
ultrapassarem 5 segundos.

- [ ] **Passo 9: Revisar e commitar o fluxo de interface**

Executar `git diff --check`, verificar que nenhum conteúdo de coluna extra ou original fica no estado React e commitar:

```powershell
git add src/features/import/csv-import.tsx src/app/diagnostico/page.tsx tests/components/csv-import.test.tsx tests/components/diagnostico-page.test.tsx tests/e2e/csv-import.spec.ts
git commit -m "feat(ui): preview and apply local CSV imports" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Tarefa 4: Provar o fluxo no navegador e fechar a Tarefa 10

**Arquivos:**
- Modificar: `docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md`

**Interfaces:**
- Consome o fluxo de importação integrado na Tarefa 3.
- Produz evidência de confirmação, preservação de dados não importados e ausência de transmissão.

- [ ] **Passo 1: Executar todos os gates de regressão**

Executar separadamente:

```powershell
npm test -- --run
npm run test:e2e
npm run typecheck
npm run build
Test-Path out\diagnostico\index.html
```

Esperado: testes unitários/componentes e E2E sem falhas, typecheck/build com exit code 0 e `Test-Path` retorna `True`.

- [ ] **Passo 2: Atualizar somente as caixas verificadas da Tarefa 10**

Em `docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md`, marcar as quatro caixas da Tarefa 10 somente depois de validar: casos unitários, parser local sem upload, prévia com confirmação e E2E sem requisição de rede. Não marcar itens de exportação/documentos nem critérios de release.

- [ ] **Passo 3: Revisar e commitar a checklist verificada**

Executar `git diff --check`, revisar o diff e commitar somente o documento principal:

```powershell
git add docs/superpowers/plans/2026-10-16-copiloto-transicao-6x1.md
git commit -m "docs(plan): complete local CSV import" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Revisão final

- Todas as colunas adicionais são ausentes da saída normalizada, prévia, armazenamento e requisições.
- A confirmação parcial aplica somente linhas válidas e somente após ação explícita.
- A substituição invalida resultados/checks sem apagar data, cobertura ou alterações financeiras de cenário.
- O arquivo original não é salvo em memória React após a análise, no `localStorage` ou em qualquer serviço remoto.
- GJ-04/aprovação jurídica continuam bloqueando qualquer publicação.
