# Planejador simplificado de escalas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar uma sugestao semanal a partir da quantidade de funcionarios e da cobertura por dia, em uma tela simples.

**Architecture:** Dominio operacional independente dos salarios, com gerador limitado e verificador independente. A pagina inicial apresenta formulario e resultado; o painel atual continua em `/diagnostico/`. Tudo e processado no navegador.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS existente, Vitest/Testing Library, Playwright. Sem novas dependencias.

## Global Constraints

- Especificacao aprovada: [design](../specs/2026-10-30-planejador-simplificado-design.md).
- Padrao conservador de ate 40 horas semanais, sem horas extras.
- Teto diario normal conservador de 8 horas efetivas.
- Ate cinco dias trabalhados e ao menos dois dias de folga na semana.
- Nao gerar automaticamente 42 horas em cinco dias ou presumir instrumento coletivo aplicavel.
- Processamento integral no navegador, sem novos servicos, telemetria, transmissao de dados ou dependencias externas de otimizacao.
- Busca limitada e comportamento deterministico para as mesmas entradas.
- Limite aprovado durante a implementacao: 200 funcionarios por simulacao.
- Nao transformar ausencia de dados em aprovacao.
- Preservar dados salvos, CSV e o fluxo detalhado existente.
- Fora de escopo: edicao manual, exportacao, regimes especiais, restricoes individuais e operacao atravessando meia-noite.
- Comandos e caminhos locais no Windows usam PowerShell e barras invertidas.
- Texto visivel em portugues, com acentuacao como nos componentes existentes.
- Nao modificar os parametros legais, reabrir GJ-02 ou fechar GJ-04.
- Cada commit inclui `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

## Mapa de arquivos e responsabilidades

### Estado final da execucao

As seis entregas foram implementadas na branch `feat/planejador-simplificado`.
Os checklists abaixo preservam o roteiro TDD original; a verificacao final
registrou 339 testes de unidade/componentes e 13 E2E passando, alem de
`npm run build`, `npm run typecheck` e `git diff --check`.
O build informou apenas o aviso preexistente sobre o lockfile externo ao
repositorio.

Decisoes confirmadas durante a execucao: limite de 200 pessoas aprovado
pelo usuario; busca amostral com eliminacao de trabalhadores intercambiaveis;
link de retorno do diagnostico ao planejador; E2E antigos preservados
por meio do novo link secundario. Os testes do caso de 200 pessoas
comprovam cobertura para a operacao simples com ate 1.000 avaliacoes.

Os commits sao agrupados por dominio, interface e documentacao, em vez
de criar um commit por subetapa. Nenhum merge ou push e automatico.

Novos arquivos:

- `src/domain/schedules/types.ts`: contratos operacionais e resultados.
- `src/domain/schedules/validate-schedule-input.ts`: validacao do dominio.
- `src/domain/schedules/verify-schedule.ts`: horas, cobertura e descansos.
- `src/domain/schedules/generate-schedule.ts`: busca deterministica limitada.
- `src/features/schedules/form-values.ts`: formulario, parsing e datas.
- `src/features/schedules/schedule-form.tsx`: equipe e funcionamento por dia.
- `src/features/schedules/schedule-result.tsx`: grade, cobertura e pendencias.
- `src/features/schedules/schedule-planner.tsx`: estado e coordenacao assincrona.
- Testes correspondentes nas pastas existentes.

Arquivos modificados:

- `src/app/page.tsx`: abrir diretamente o planejador, sem landing intermediaria.
- `src/app/globals.css`: estilos com prefixo `planner-`, sem alterar dashboard.
- `tests/unit/smoke.test.tsx`: nova pagina inicial.
- `tests/e2e/core-flow.spec.ts`, `csv-import.spec.ts`, `local-data.spec.ts`,
  `privacy.spec.ts`: manter cenarios existentes com acesso direto ao diagnostico.
- `docs/PRD — Copiloto de Transição 6x1.md`: registrar o novo incremento e limites.

Nao mover ou reescrever `src/app/diagnostico/page.tsx`; adicionar apenas
o link de retorno ao planejador, preservando a rota, seus testes de
componente e o formato persistido.

---

### Task 1: Contrato e validacao da entrada operacional

**Files:**
- Create: `src/domain/schedules/types.ts`
- Create: `src/domain/schedules/validate-schedule-input.ts`
- Test: `tests/unit/schedule-validation.test.ts`

**Interfaces:**
- Consumes: `Result<T, E>` de `src/domain/result.ts` e `isDateOnly`.
- Produces: `validateScheduleInput(input: ScheduleInput): Result<ScheduleInput, ScheduleError[]>`.

- [ ] **Step 1: Escrever os testes de entrada invalida e valida.**

```ts
import { describe, expect, it } from "vitest";
import { validateScheduleInput } from "@/domain/schedules/validate-schedule-input";
import type { ScheduleInput } from "@/domain/schedules/types";

const input: ScheduleInput = {
  referenceDate: "2026-12-14",
  employeeCount: 2,
  weeklyMinuteLimit: 2400,
  days: Array.from({ length: 7 }, (_, day) => ({
    day, open: day < 5, start: 540, end: 1080, minimumPeople: 1,
  })),
};

describe("schedule validation", () => {
  it("accepts a week independently of salaries", () => {
    expect(validateScheduleInput(input)).toEqual({ ok: true, value: input });
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid employee count %s", employeeCount => {
      expect(validateScheduleInput({ ...input, employeeCount }).ok).toBe(false);
    },
  );
  it("rejects operation across midnight", () => {
    const days = input.days.map(day =>
      day.day === 0 ? { ...day, start: 1080, end: 540 } : day);
    expect(validateScheduleInput({ ...input, days }).ok).toBe(false);
  });
  it("rejects automatic 42-hour allocation", () => {
    expect(validateScheduleInput({ ...input, weeklyMinuteLimit: 2520 }).ok)
      .toBe(false);
  });
});
```

Adicionar casos para data invalida, dia duplicado/ausente/fora de 0..6,
minimo fracionario, horario fora de 0..1440, abertura igual ao fechamento,
limite semanal nao inteiro/zero, dia fechado com valores desativados e
semana inteiramente fechada aceita.

- [ ] **Step 2: Executar RED.**

Run: `npm test -- --run tests\unit\schedule-validation.test.ts`
Expected: falha por modulo ausente.

- [ ] **Step 3: Implementar estes contratos e a validacao.**

```ts
export type ScheduleError = { field: string; message: string };
export type OperationDay = {
  day: number;
  open: boolean;
  start: number;
  end: number;
  minimumPeople: number;
};
export type ScheduleInput = {
  referenceDate: string;
  employeeCount: number;
  weeklyMinuteLimit: number;
  days: OperationDay[];
};
export type Shift = {
  person: number;
  day: number;
  start: number;
  end: number;
  breakStart: number | null;
  breakMinutes: number;
};
export type CoverageGap = {
  day: number;
  start: number;
  end: number;
  missingPeople: number;
};
export type ScheduleIssue = {
  code: "structure" | "daily" | "weekly" | "days" | "break" |
    "inter-shift" | "weekly-rest";
  person: number;
  message: string;
};
export type ScheduleVerification = {
  issues: ScheduleIssue[];
  gaps: CoverageGap[];
  weeklyMinutesByPerson: number[];
  pendingChecks: string[];
};
export type ScheduleResult = {
  shifts: Shift[];
  verification: ScheduleVerification;
  status: "covered" | "partial" | "not-found" | "no-demand";
  searchLimited: boolean;
  additionalPeopleLowerBound: number;
};
```

Validar todos os numeros com `Number.isSafeInteger`, todos os dias
exatamente uma vez e todos os campos ativos. Dominio recebe minutos
inteiros, sem arredondamento. Valores inativos de dias fechados nao geram
demanda. Erros usam campos `employeeCount`, `weeklyMinuteLimit`,
`referenceDate`, `days[0].start` e equivalentes.

Permitir horario entre 00:00 e 24:00 no modelo temporal, mas restringir o
escopo diurno a 05:00..22:00 na entrada ativa, com mensagem explicita.
Essa restricao e de suporte do simulador comum, nao uma afirmacao de
ausencia de regras noturnas em todas as categorias.

- [ ] **Step 4: Executar GREEN e conferir tipos.**

Run: `npm test -- --run tests\unit\schedule-validation.test.ts`
Expected: todos os casos acima passam.

- [ ] **Step 5: Commit apenas dos arquivos desta tarefa.**

Mensagem: `feat(schedules): validate operational scheduling inputs`.

### Task 2: Verificador independente de escala e cobertura

**Files:**
- Create: `src/domain/schedules/verify-schedule.ts`
- Test: `tests/unit/schedule-verification.test.ts`

**Interfaces:**
- Consumes: `ScheduleInput`, `Shift`, `ScheduleVerification`.
- Produces: `verifySchedule(input: ScheduleInput, shifts: Shift[]): ScheduleVerification`.
- Produces: `workingSegments(shift: Shift): Array<{ start: number; end: number }>`.

- [ ] **Step 1: Escrever o teste que impede contar intervalo na cobertura.**

```ts
import { expect, it } from "vitest";
import { verifySchedule } from "@/domain/schedules/verify-schedule";

it("removes a person from coverage during their break", () => {
  const result = verifySchedule({
    referenceDate: "2026-12-14", employeeCount: 1, weeklyMinuteLimit: 2400,
    days: Array.from({ length: 7 }, (_, day) => ({
      day, open: day === 0, start: 540, end: 1080, minimumPeople: 1,
    })),
  }, [{
    person: 0, day: 0, start: 540, end: 1080,
    breakStart: 780, breakMinutes: 60,
  }]);
  expect(result.weeklyMinutesByPerson).toEqual([480]);
  expect(result.gaps).toEqual([
    { day: 0, start: 780, end: 840, missingPeople: 1 },
  ]);
});
```

Adicionar casos de cobertura superposta, limites em minutos exatos,
intervalos de 0/15/60 minutos conforme trabalho efetivo,
intervalo fora do turno, intervalo no inicio/fim sem trabalho nos dois
lados, pessoa inexistente, turnos duplicados no mesmo dia, dia fechado,
turno fora da operacao, mais de 8 horas diarias, mais que o limite semanal,
seis dias trabalhados e descanso interjornada abaixo de 11 horas.

Testar repousos de 35 horas e consecutivos de 59 horas usando tempos
absolutos na semana. Um repouso que depende do domingo anterior ou da
segunda seguinte recebe pendencia, nao aprovacao inventada.

- [ ] **Step 2: Executar RED.**

Run: `npm test -- --run tests\unit\schedule-verification.test.ts`
Expected: falha por modulo ausente.

- [ ] **Step 3: Implementar segmentos, varredura de cobertura e verificacoes.**

```ts
export function workingSegments(shift: Shift) {
  if (shift.breakStart === null) {
    return [{ start: shift.start, end: shift.end }];
  }
  return [
    { start: shift.start, end: shift.breakStart },
    { start: shift.breakStart + shift.breakMinutes, end: shift.end },
  ].filter(segment => segment.end > segment.start);
}
```

Para cada dia, ordenar o conjunto de pontos formado por abertura,
fechamento e inicios/fins dos segmentos de trabalho. Para cada par de
pontos consecutivos dentro da operacao, contar pessoas distintas cobrindo
todo o intervalo semiaberto `[start, end)`. Gerar `CoverageGap` somente
quando `minimumPeople - present > 0`. Fundir intervalos adjacentes do
mesmo dia com a mesma falta.

Somar `end - start - breakMinutes` por pessoa. O intervalo minimo decorre
das horas efetivas, nao da permanencia total. Validar estruturalmente os
turnos antes de usa-los em cobertura, sem permitir que turnos malformados
produzam resultado completo.

Para descanso, converter `day * 1440 + minute`, ordenar turnos por pessoa
e comparar os pares consecutivos. Examinar os dias de folga internos da
semana: janela de um dia requer 35 horas continuas; dois ou mais dias
consecutivos requerem ao menos 59 horas. Para fronteiras sem historico,
registrar pendencia. Sempre manter pendencias para domingos/feriados,
categoria e historico de semanas adjacentes.

- [ ] **Step 4: Executar GREEN.**

Run: `npm test -- --run tests\unit\schedule-validation.test.ts tests\unit\schedule-verification.test.ts`
Expected: validacao e verificador passam; intervalo descoberto permanece
visivel mesmo com capacidade semanal agregada suficiente.

- [ ] **Step 5: Commit.**

Mensagem: `feat(schedules): verify coverage breaks and modeled rest rules`.

### Task 3: Busca de escala limitada e deterministica

**Files:**
- Create: `src/domain/schedules/generate-schedule.ts`
- Test: `tests/unit/schedule-generation.test.ts`

**Interfaces:**
- Consumes: contratos das tarefas 1 e 2.
- Produces:

```ts
export type SearchOptions = {
  maxEvaluations?: number;
  yieldControl?: () => Promise<void>;
};
export function generateSchedule(
  input: ScheduleInput,
  options?: SearchOptions,
): Promise<Result<ScheduleResult, ScheduleError[]>>;
```

`maxEvaluations` e um limite interno de busca para testes/execucao, nao
um campo apresentado ao usuario. Default: 50.000 avaliacoes, incluindo
geracao de candidatos. A cada 250 avaliacoes, executar `yieldControl`,
cujo default e uma Promise com `setTimeout(resolve, 0)`. Contar trabalho
antes de loops potencialmente caros, nao apenas resultados aceitos.

- [ ] **Step 1: Escrever exemplos verificaveis do gerador.**

```ts
import { expect, it } from "vitest";
import { generateSchedule } from "@/domain/schedules/generate-schedule";
import { verifySchedule } from "@/domain/schedules/verify-schedule";

it("finds coverage for a simple four-hour operation", async () => {
  const input = {
    referenceDate: "2026-12-14", employeeCount: 1, weeklyMinuteLimit: 2400,
    days: Array.from({ length: 7 }, (_, day) => ({
      day, open: day < 5, start: 540, end: 780, minimumPeople: 1,
    })),
  };
  const result = await generateSchedule(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected valid scheduling input");
  expect(result.value.status).toBe("covered");
  const checked = verifySchedule(input, result.value.shifts);
  expect(checked.issues).toEqual([]);
  expect(checked.gaps).toEqual([]);
  expect(checked.weeklyMinutesByPerson).toEqual([1200]);
});
```

Adicionar testes para duas pessoas com intervalos escalonados numa
operacao 09:00..18:00 com minimo 1; sete dias de abertura com folgas
distribuidas; uma pessoa insuficiente; limite semanal menor que 40 horas;
operacao fechada em todos os dias; horarios nao multiplos de 15 minutos;
duas execucoes identicas com mesmo resultado; `maxEvaluations: 1`
retornando estado limitado sem impossibilidade declarada.

- [ ] **Step 2: Executar RED.**

Run: `npm test -- --run tests\unit\schedule-generation.test.ts`
Expected: falha por modulo ausente.

- [ ] **Step 3: Implementar a busca com este procedimento.**

1. Validar entrada e retornar os erros do dominio antes de alocar equipe.
2. Inicializar escala vazia, verificada, como melhor candidato parcial.
3. Ordenar faixas descobertas por inicio do dia e minuto. Priorizar a
   faixa com maior falta; desempatar por dia/minuto.
4. Enumerar pessoas elegiveis por menos minutos atribuidos e identificador.
5. Enumerar candidatos de um turno por pessoa/dia; respeitar disponibilidade
   dentro da operacao, teto diario, teto semanal restante e cinco dias.
6. Usar candidatos curtos sem intervalo para ate 240 minutos efetivos;
   candidatos de ate 360 minutos com 15 minutos de intervalo; candidatos
   de ate 480 minutos com 60 minutos. Nunca descartar horarios informados
   por nao coincidirem com uma grade de 15/30/60 minutos.
7. Explorar limites de faixas descobertas e eventos ja existentes como
   inicios/fins de turnos/intervalos, sem arredondar os minutos informados.
   A busca e amostral, nao exaustiva; restringir as extensoes aos oito
   melhores candidatos de cada nivel e nao materializar o produto
   cartesiano de todos os candidatos.
8. Posicionar intervalo estritamente dentro do turno, com trabalho antes e
   depois. Priorizar sobreposicao com colegas que continuam trabalhando.
9. Verificar cada extensao de escala usando o verificador independente.
   Guardar somente extensoes sem violacoes; descartar extensoes que nao
   reduzam o total de pessoa-minutos descobertos.
10. Usar busca com retrocesso, mantendo a melhor escala parcial. Ordenar
    por menos pessoa-minutos descobertos, menos minutos alocados e ordem
    lexicografica de pessoa/dia/inicio/intervalo como desempate estavel.
11. Terminar ao encontrar cobertura completa ou atingir o orcamento.
    Nao afirmar impossibilidade se o espaco nao foi exaurido.
12. Verificar novamente o candidato final. `covered` exige ausencia de
    gaps E issues; pendencias juridicas continuam presentes.

Calcular limite inferior de pessoas adicionais como o maximo entre:
`max(0, picoDeDemanda - employeeCount)` e
`max(0, ceil(pessoaMinutosDemandados / weeklyMinuteLimit) - employeeCount)`.
Identificar o valor como limite inferior, pois distribuicao, folgas e
intervalos podem exigir mais pessoas. Nao usar esse numero para
proclamar uma escala viavel com contratacoes nao simuladas.

`no-demand` usa turnos vazios e zero falta. `partial` exige alguma
alocacao valida, mas deixa gaps explicitos. `not-found` indica ausencia
de sugestao util encontrada. `searchLimited` registra interrupcao pelo
orcamento, inclusive quando houver uma escala parcial.

- [ ] **Step 4: Executar GREEN e verificar o resultado pelo verificador real.**

Run: `npm test -- --run tests\unit\schedule-validation.test.ts tests\unit\schedule-verification.test.ts tests\unit\schedule-generation.test.ts`
Expected: sem violacoes escondidas, sem ajuste silencioso dos minutos.

- [ ] **Step 5: Commit.**

Mensagem: `feat(schedules): generate bounded deterministic weekly suggestions`.

### Task 4: Formulario compacto e parsing sem salarios

**Files:**
- Create: `src/features/schedules/form-values.ts`
- Create: `src/features/schedules/schedule-form.tsx`
- Test: `tests/unit/schedule-form-values.test.ts`
- Test: `tests/components/schedule-form.test.tsx`

**Interfaces:**
- Consumes: `ScheduleInput`, `ScheduleError`, `ErrorSummary`, `fieldIdFor`,
  `getTodayInSaoPaulo`, `getTransitionWeek`, `getStageDates`.
- Produces:

```ts
export type ScheduleFormValues = {
  employeeCount: string;
  referenceDate: string;
  weeklyHours: string;
  days: Array<{
    day: number;
    open: boolean;
    start: string;
    end: string;
    minimumPeople: string;
  }>;
};
export function createScheduleFormValues(): ScheduleFormValues;
export function parseScheduleForm(
  values: ScheduleFormValues,
): Result<ScheduleInput, ScheduleError[]>;
export type ScheduleFormProps = {
  values: ScheduleFormValues;
  errors: ScheduleError[];
  busy: boolean;
  onChange: (values: ScheduleFormValues) => void;
  onSubmit: () => void;
};
```

- [ ] **Step 1: Escrever os testes de entrada e copia por dia.**

```tsx
it("starts without asking for salaries", () => {
  const values = createScheduleFormValues();
  render(<ScheduleForm values={values} errors={[]} busy={false}
    onChange={vi.fn()} onSubmit={vi.fn()} />);
  expect(screen.getByLabelText("Quantos funcionários você tem hoje?"))
    .toHaveValue(null);
  expect(screen.queryByLabelText(/Salário/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Gerar escala" }))
    .toBeInTheDocument();
});
```

Testar parse de `08:17` sem arredondar; quantidade vazia, `1.5`,
notacao exponencial, numero inseguro; semana invalida; horario fora do
escopo diurno; limite semanal em horas inteiras de 1 a 40; dias fechados;
copia para dias explicitamente selecionados sem alterar os demais.

- [ ] **Step 2: Executar RED.**

Run: `npm test -- --run tests\unit\schedule-form-values.test.ts tests\components\schedule-form.test.tsx`
Expected: falha por componentes/modulos ausentes.

- [ ] **Step 3: Implementar formulario controlado e parsing.**

Inicializar equipe vazia, jornada 40, hoje em Sao Paulo como referencia
e dias uteis 09:00..18:00 com minimo 1; sabado/domingo fechados. Exibir
que esses horarios sao valores iniciais editaveis, nao dados detectados.
Se a data local falhar, deixar vazia e pedir preenchimento explicitamente.

Usar strings nos controles. Parse de inteiros com regex de digitos e
`Number.isSafeInteger`; converter horas em minutos depois de validar.
Parse de horario com regex `^([01]\\d|2[0-3]):([0-5]\\d)$`, sem `Date`
para horarios do dia. Dias fechados sao normalizados para valores
numericos neutros, sem demanda. Delegar as regras ao validador do dominio.

Usar `<fieldset>` para cada dia no celular e layout em linhas no desktop.
Labels completos: `Aberto — Segunda-feira`, `Abertura — Segunda-feira`,
`Fechamento — Segunda-feira`, `Mínimo de pessoas — Segunda-feira`.
Desativar campos de dia fechado sem apagar valores digitados do formulario.

Acao de copia: selecionar dia de origem e dias de destino em checkboxes,
botao `Copiar para os dias selecionados`; copiar estado aberto, horarios
e minimo so ao confirmar. Nao usar uma segunda tag `<form>` aninhada.

Associar erros com `aria-invalid`, `aria-describedby` e IDs via
`fieldIdFor`. Inserir `ErrorSummary`, focar o resumo/primeiro campo
invalido apos submit e manter a navegacao dos links do resumo.

Apresentar a semana segunda..domingo derivada de `getTransitionWeek`.
Usar `getStageDates` para avisos de semanas de transicao. O teto de 40
continua sendo uma escolha conservadora da simulacao, nao limite
juridico inferido automaticamente para qualquer data.

- [ ] **Step 4: Executar GREEN.**

Run: `npm test -- --run tests\unit\schedule-form-values.test.ts tests\components\schedule-form.test.tsx`
Expected: copia, erros associados e parse exato passam.

- [ ] **Step 5: Commit.**

Mensagem: `feat(ui): add compact team and daily operation form`.

### Task 5: Resultado, coordenacao e pagina principal responsiva

**Files:**
- Create: `src/features/schedules/schedule-result.tsx`
- Create: `src/features/schedules/schedule-planner.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/unit/smoke.test.tsx`
- Test: `tests/components/schedule-planner.test.tsx`
- Test: `tests/components/schedule-result.test.tsx`

**Interfaces:**
- Consumes: `generateSchedule`, `parseScheduleForm`, `ScheduleForm`.
- Produces: `SchedulePlanner()` e
  `ScheduleResultView({ result, stale }: { result: ScheduleResult; stale: boolean })`.

- [ ] **Step 1: Escrever os testes do fluxo e dos estados de resultado.**

```tsx
it("invalidates the previous suggestion when team size changes", async () => {
  render(<SchedulePlanner />);
  fireEvent.change(screen.getByLabelText("Quantos funcionários você tem hoje?"),
    { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
  await screen.findByRole("region", { name: "Sua escala semanal" });
  fireEvent.change(screen.getByLabelText("Quantos funcionários você tem hoje?"),
    { target: { value: "3" } });
  expect(screen.getByRole("status"))
    .toHaveTextContent("Dados alterados. Gere a escala novamente.");
  expect(screen.queryByText("Cobertura atendida")).not.toBeInTheDocument();
});
```

Adicionar casos de `covered` com pendencias juridicas, `partial`,
`not-found`, `no-demand`, limite inferior de contratacoes, total de horas
e intervalos visiveis. Um resultado `covered` com pendencias nunca recebe
texto de conformidade integral. Nao depender de mocks para provar o caso
principal; usar o gerador e verificador reais.

- [ ] **Step 2: Executar RED.**

Run: `npm test -- --run tests\components\schedule-planner.test.tsx tests\components\schedule-result.test.tsx`
Expected: falha por componentes ausentes.

- [ ] **Step 3: Implementar coordenacao e resultado.**

Manter `values`, `errors`, `result`, `busy` e `stale` no planejador.
Ao alterar entradas, marcar `stale`, limpar erros antigos e retirar
indicadores positivos do resultado. Durante busca, desativar edicao e
submit e exibir status `Gerando escala…`, evitando resposta de uma
solicitacao antiga sobrescrever dados novos.

O caminho de erros esperados usa `Result`. Para excecao inesperada,
capturar somente no limite da acao de interface, registrar com
`console.error` e exibir `Não foi possível gerar a escala. Tente novamente.`;
nao retornar escala vazia como sucesso. Garantir reset de busy com
`finally`. Sem catch amplo no dominio.

Grade com caption `Sua escala semanal`, cabecalhos de dias e pessoas,
intervalos e horas efetivas. Formatar minutos por divisao inteira/resto,
inclusive totais como `37h45`, sem arredondamento de horas.
Pessoas sem turnos continuam visiveis como folga.

Mensagens:

- `covered`: `Cobertura atendida nas verificações implementadas.`
- `partial`: `Ainda há horários sem cobertura.`
- `not-found`: `Não encontramos uma escala com as condições informadas.`
- `no-demand`: `Nenhum dia de funcionamento foi informado.`
- busca limitada: `A busca atingiu seu limite; isso não comprova que a escala seja impossível.`
- limite inferior: `Estimativa mínima de pessoas adicionais: N. A quantidade suficiente depende da distribuição de turnos, intervalos e folgas.`

Pendencias juridicas ficam visiveis como resumo; detalhes em `<details>`.
Aviso permanente: simulacao, parametros provisorios e GJ-04 pendente.
Nao ocultar gaps nem violacoes em detalhes fechados.

Nova pagina inicial:

```tsx
import { SchedulePlanner } from "@/features/schedules/schedule-planner";

export default function Home() {
  return <SchedulePlanner />;
}
```

No topo do planejador, incluir `Link` para `/diagnostico/`, texto
`Diagnóstico e custos detalhados`. Nao montar o painel detalhado dentro
do planejador nem importar suas premissas automaticamente.

CSS com classes `planner-shell`, `planner-header`, `planner-layout`,
`planner-form`, `planner-result`, `planner-days`, `planner-table-scroll`,
`planner-summary`, `planner-notice`. Desktop: grid
`minmax(19rem, 24rem) minmax(0, 1fr)`; abaixo de 60rem: uma coluna.
Usar `min-width: 0`, `width: min(100%, 80rem)` e scroll horizontal
apenas no contenedor da grade com nome acessivel e `tabIndex={0}`.
Nao permitir scroll horizontal no documento. Foco visivel, contraste,
alvos de 44px e sem sidebar fixa no planejador.

Atualizar smoke test para o novo h1 e link secundario. O teste antigo
espera href sem barra final, diferente do codigo atual; nesta tarefa,
substituir a assercao pela nova navegacao, sem corrigir problemas
desconectados no dashboard.

- [ ] **Step 4: Executar GREEN e tipos.**

Run: `npm test -- --run tests\components\schedule-planner.test.tsx tests\components\schedule-result.test.tsx tests\unit\smoke.test.tsx tests\components\diagnostico-page.test.tsx`

Run: `npm run typecheck`

Expected: fluxo novo e painel detalhado preservados, sem erros de tipos.

- [ ] **Step 5: Commit.**

Mensagem: `feat(ui): make weekly schedule planning the primary experience`.

### Task 6: Navegacao secundaria, privacidade e validacao final

**Files:**
- Create: `tests/e2e/schedule-planner.spec.ts`
- Modify: `tests/e2e/core-flow.spec.ts`
- Modify: `tests/e2e/csv-import.spec.ts`
- Modify: `tests/e2e/local-data.spec.ts`
- Modify: `tests/e2e/privacy.spec.ts`
- Modify: `docs/PRD — Copiloto de Transição 6x1.md`

**Interfaces:**
- Consumes: pagina inicial nova, `/diagnostico/` inalterado e testes anteriores.
- Produces: evidencias de fluxo, layout e privacidade sem remover cobertura antiga.

- [ ] **Step 1: Escrever E2E para 390x844 e 1440x900.**

```ts
import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`plans a week at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/");
    await page.getByLabel("Quantos funcionários você tem hoje?").fill("2");
    await page.getByRole("button", { name: "Gerar escala" }).click();
    await expect(page.getByRole("region", { name: "Sua escala semanal" }))
      .toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await page.getByLabel("Quantos funcionários você tem hoje?").fill("3");
    await expect(page.getByRole("status"))
      .toContainText("Dados alterados. Gere a escala novamente.");
    await page.getByRole("link", { name: "Diagnóstico e custos detalhados" })
      .click();
    await expect(page.getByRole("heading", { name: "Premissas", exact: true }))
      .toBeVisible();
  });
}
```

Acrescentar teste com 1 pessoa e operacao extensa exibindo falta sem
declarar conformidade. Verificar teclado, labels de intervalos e
ausencia de overflow mesmo quando a grade tem sete colunas.

Capturar requests apos carregar a pagina. Usar horarios distintivos
`08:17`/`17:43` e contagem distintiva para detectar envio em URLs/body.
Reusar o metodo de verificacao do teste de privacidade existente, sem
testar ausencia de qualquer substring numerica curta em assets estaticos.
Verificar que nao houve gravacao no storage pelo planejador e que um
registro salvo de diagnostico permanece exatamente igual apos gerar.

- [ ] **Step 2: Atualizar entradas dos E2E antigos sem reduzir suas assercoes.**

Nos testes que antes iam a home e clicavam `Começar diagnóstico`, usar
o novo link `Diagnóstico e custos detalhados`. Manter teste explicito da
navegacao secundaria no novo E2E. Atualizar apenas as assercoes de CTA da
landing que deixou de existir. Preservar todas as assercoes de CSV,
salvar/excluir/restaurar, parametros, custos e privacidade.

- [ ] **Step 3: Executar o E2E focado e inspecionar no navegador.**

Run: `npm run test:e2e -- schedule-planner.spec.ts`
Expected: fluxo em ambos os viewports passa; controle primario utilizavel,
sem overflow do documento, resultado e pendencias legiveis.

Usar as ferramentas de browser para inspecionar uma geracao real no desktop
e celular, nao somente o esboco. Se iniciar servidor auxiliar, confirmar
resposta HTTP e encerra-lo depois da verificacao, sem afetar processos
existentes. O `webServer` de Playwright ja realiza build e serve `out`.

- [ ] **Step 4: Atualizar o PRD preservando o historico do release inicial.**

Registrar secao de incremento posterior com:

```md
## Incremento: planejador semanal simplificado

O fluxo principal passa a gerar sugestoes semanais com equipe homogenea,
operacao diurna e cobertura minima por dia. O diagnostico financeiro
permanece acessivel como ferramenta secundaria.

As sugestoes verificam as regras modeladas e apresentam pendencias
explicitamente. Parametros provisorios e GJ-04 continuam impedindo
interpretar o resultado como aprovacao juridica integral.

Edicao manual e exportacao continuam fora desta entrega. O historico
do release inicial descreve o escopo original, anterior ao gerador.
```

Atualizar as referencias que afirmam, no presente, que o sistema nao gera
escalas. Nao reescrever datas/gates como se tivessem sido verificados
novamente. Vincular especificacao e plano usando caminhos relativos.

- [ ] **Step 5: Executar a verificacao final e revisar o diff.**

Run: `npm test -- --run`

Run: `npm run typecheck`

Run: `npm run test:e2e`

Expected: suite unitaria/componentes, tipos, build exportavel e E2E passam.
Se o E2E reutilizar servidor existente, executar tambem `npm run build`
para provar o build atual. Nao instalar dependencias sem falha por falta
de pacote/ferramenta ou alteracao de manifesto.

Run: `git --no-pager diff --check`

Revisar diretamente o diff final: nao afirmar validade juridica, nao
contar intervalo como cobertura, nao alterar dados salvos nem fazer
requests com dados operacionais. Corrigir apenas falhas introduzidas
ou diretamente ligadas ao incremento.

- [ ] **Step 6: Commit e entrega.**

Mensagem: `test(ui): verify simplified scheduling flow and preserve detailed tools`.

Informar o que foi implementado, comandos efetivamente executados,
limites do gerador e pendencias juridicas. Nao declarar passagem de
testes que nao tenham sido executados.

## Revisao de cobertura do plano

- Tela unica e prioridade operacional: tarefas 4 e 5.
- Geracao nova, limites e resultado confiavel: tarefas 1, 2 e 3.
- Intervalos e cobertura temporal: tarefas 2 e 3.
- Validacao, erros, busca limitada e pendencias: tarefas 1 a 5.
- Copia entre dias e resultado desatualizado: tarefas 4 e 5.
- Preservacao de diagnostico, CSV e dados salvos: tarefas 5 e 6.
- Responsividade, teclado, privacidade, tipos e build: tarefas 4 a 6.
- Documentacao de produto: tarefa 6.
- Sem dependencia nova ou transmissao operacional: todas as tarefas.
