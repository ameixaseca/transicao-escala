import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import DiagnosticPage from "@/app/diagnostico/page";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const openDiagnostic = () => {
  render(<DiagnosticPage />);
};

const submitDiagnostic = () => {
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
};

const submitScenarios = () => {
  fireEvent.click(screen.getByRole("button", { name: "Calcular cenários" }));
};

const createCsvFile = (contents: string) =>
  new File([contents], "equipe.csv", { type: "text/csv" });

describe("diagnostic dashboard", () => {
  it("starts in Premissas and exposes all four sections", () => {
    openDiagnostic();

    expect(screen.getByRole("link", { name: "Voltar ao planejador de escalas" }))
      .toHaveAttribute("href", "/");
    expect(
      screen.getByRole("heading", { name: "Premissas", level: 1 }),
    ).toBeInTheDocument();
    for (const [section, id] of [
      ["Premissas", "premissas"],
      ["Diagnóstico", "diagnostico"],
      ["Cenários", "cenarios"],
      ["Linha do tempo", "linha-do-tempo"],
    ]) {
      expect(
        screen.getByRole("link", { name: section }),
      ).toHaveAttribute("href", `#${id}`);
    }
    expect(
      screen.getAllByText(/Parâmetros legais provisórios/).length,
    ).toBeGreaterThan(0);
  });

  it("restores saved assumptions before enabling edits and warns on legal version mismatch", () => {
    localStorage.setItem(
      "transicao-escala:assumptions",
      JSON.stringify({
        schemaVersion: 1,
        savedAt: "2026-10-29T12:00:00.000Z",
        assumptions: {
          employeeRows: [
            {
              localId: "stored-person",
              salaryDecimal: "98.765,43",
              weeklyHoursDecimal: "42,75",
              contractType: "part-time",
            },
          ],
          coverage: [
            {
              weekday: 1,
              startMinute: 495,
              endMinute: 1440,
              minimumPeople: 1,
            },
          ],
          referenceDate: "2026-12-16",
          legalParameterVersion: "older-legal-parameters",
        },
      }),
    );

    openDiagnostic();

    expect(screen.getByLabelText("Data de referência")).toHaveValue("2026-12-16");
    expect(screen.getByLabelText("Salário mensal — Pessoa 1")).toHaveValue(
      "98.765,43",
    );
    expect(screen.getByLabelText("Horas semanais — Pessoa 1")).toHaveValue(
      "42,75",
    );
    expect(screen.getByLabelText("Fim — Faixa 1")).toHaveValue("24:00");
    expect(
      screen.getByText(
        "Os parâmetros legais salvos mudaram. Revise as premissas e calcule o diagnóstico novamente.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Diagnóstico pendente.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Resultados —/ })).toBeNull();
  });

  it("keeps the legal timeline available before a valid diagnostic", () => {
    openDiagnostic();

    expect(
      screen.getByRole("heading", { name: "Linha do tempo legal" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Etapa 1" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "Etapa 2" })).toHaveLength(1);
    expect(
      screen.getAllByText(
        "Nesta semana passa a valer a nova jornada. Confira se a escala observa a regra nova.",
      ),
    ).toHaveLength(2);
  });

  it("shows all three diagnostic stages after valid form submission", () => {
    openDiagnostic();
    submitDiagnostic();

    expect(
      screen.getByRole("heading", { name: "Antes da etapa 1" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Etapa 1" })).toHaveLength(2);
    expect(screen.getAllByRole("heading", { name: "Etapa 2" })).toHaveLength(2);
    expect(screen.queryByText("Diagnóstico pendente.")).not.toBeInTheDocument();
  });

  it("allows scenario financial inputs while results wait for a valid diagnostic", () => {
    openDiagnostic();

    const salary = screen.getByRole("textbox", {
      name: "Salário mensal de reposição",
    });
    fireEvent.change(salary, { target: { value: "3.100,50" } });

    expect(salary).toHaveValue("3.100,50");
    expect(screen.getByText("Resultados pendentes.")).toBeInTheDocument();
  });

  it("shows domain validation errors for invalid scenario financial assumptions", () => {
    openDiagnostic();
    submitDiagnostic();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Salário mensal de reposição" }),
      { target: { value: "0" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Encargos do empregador (%)" }),
      { target: { value: "-10" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Perda mensal de receita" }),
      { target: { value: "-1" } },
    );

    submitScenarios();
    expect(screen.getByText("O salário de reposição deve ser maior que zero.")).toBeInTheDocument();
    expect(screen.getByText("A taxa de encargos não pode ser negativa.")).toBeInTheDocument();
    expect(screen.getByText("A perda de receita mensal não pode ser negativa.")).toBeInTheDocument();
  }, 15_000);

  it("does not recommend a scenario while required checks remain unknown", () => {
    openDiagnostic();
    submitDiagnostic();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Salário mensal de reposição" }),
      { target: { value: "3.000,00" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Encargos do empregador (%)" }),
      { target: { value: "30" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Perda mensal de receita" }),
      { target: { value: "0" } },
    );
    submitScenarios();

    expect(
      screen.getAllByRole("radio", { name: "Não verificado" }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("✓ Recomendado")).not.toBeInTheDocument();
  }, 15_000);

  it("clears diagnostic and scenario results when a diagnostic premise changes", () => {
    openDiagnostic();
    submitDiagnostic();

    expect(screen.getAllByText("Déficit de horas-pessoa").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Horas semanais — Pessoa 1"), {
      target: { value: "40" },
    });

    expect(screen.getByText("Diagnóstico pendente.")).toBeInTheDocument();
    expect(screen.getByText("Resultados pendentes.")).toBeInTheDocument();
  });

  it("resets stage checks to unknown after diagnostic premises change", () => {
    openDiagnostic();
    submitDiagnostic();

    for (const stageChecks of screen.getAllByRole("group", {
      name: /^Verificações —/,
    })) {
      for (const validCheck of within(stageChecks).getAllByRole("radio", {
        name: "Válido",
      })) {
        fireEvent.click(validCheck);
      }
    }

    submitScenarios();
    expect(screen.getAllByText("✓ Recomendado").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Horas semanais — Pessoa 1"), {
      target: { value: "40" },
    });
    submitDiagnostic();
    submitScenarios();

    expect(
      screen.getAllByRole("radio", { name: "Não verificado", checked: true }),
    ).toHaveLength(15);
    expect(screen.queryByText("✓ Recomendado")).not.toBeInTheDocument();
  }, 15_000);

  it("clears only scenario results when a scenario assumption changes", () => {
    openDiagnostic();
    submitDiagnostic();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Salário mensal de reposição" }),
      { target: { value: "3.000,00" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Encargos do empregador (%)" }),
      { target: { value: "30" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Perda mensal de receita" }),
      { target: { value: "0" } },
    );
    submitScenarios();

    expect(screen.getAllByRole("region", { name: /Resultados —/ })).toHaveLength(3);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Salário mensal de reposição" }),
      { target: { value: "3.100,00" } },
    );

    expect(screen.queryByText("Diagnóstico pendente.")).not.toBeInTheDocument();
    expect(screen.getByText("Resultados pendentes.")).toBeInTheDocument();
    expect(screen.getAllByText("Déficit de horas-pessoa").length).toBeGreaterThan(0);
  });

  it("clears only scenario results when a check status changes", () => {
    openDiagnostic();
    submitDiagnostic();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Salário mensal de reposição" }),
      { target: { value: "3.000,00" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Encargos do empregador (%)" }),
      { target: { value: "30" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Perda mensal de receita" }),
      { target: { value: "0" } },
    );
    submitScenarios();

    const checkGroup = screen.getByRole("group", {
      name: "Verificações — Antes da etapa 1",
    });
    fireEvent.click(
      within(within(checkGroup).getByRole("group", { name: "Jornada diária" }))
        .getByRole("radio", { name: "Válido" }),
    );

    expect(screen.queryByText("Diagnóstico pendente.")).not.toBeInTheDocument();
    expect(screen.getByText("Resultados pendentes.")).toBeInTheDocument();
    expect(screen.getAllByText("Déficit de horas-pessoa").length).toBeGreaterThan(0);
  });

  it("applies imported employees without changing other assumptions, checks, or stored data", async () => {
    localStorage.setItem(
      "transicao-escala:assumptions",
      JSON.stringify({
        schemaVersion: 1,
        savedAt: "2026-10-29T12:00:00.000Z",
        assumptions: {
          employeeRows: [
            {
              localId: "stored-person",
              salaryDecimal: "2.200,00",
              weeklyHoursDecimal: "44",
              contractType: "full-time",
            },
          ],
          coverage: [
            {
              weekday: 1,
              startMinute: 495,
              endMinute: 1440,
              minimumPeople: 1,
            },
          ],
          referenceDate: "2026-12-16",
          legalParameterVersion: "older-legal-parameters",
        },
      }),
    );
    openDiagnostic();
    await waitFor(() =>
      expect(screen.getByLabelText("Data de referência")).toHaveValue("2026-12-16"),
    );
    submitDiagnostic();
    fireEvent.click(
      within(
        screen.getAllByRole("group", { name: /^Verificações —/ })[0],
      ).getAllByRole("radio", { name: "Válido" })[0],
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Salário mensal de reposição" }),
      { target: { value: "3.100,75" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Encargos do empregador (%)" }),
      { target: { value: "35" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Perda mensal de receita" }),
      { target: { value: "123,45" } },
    );
    submitScenarios();
    expect(screen.getAllByRole("region", { name: /Resultados —/ })).toHaveLength(3);

    const timelineCheck = screen.getAllByLabelText(
      "Revisar limite de jornada e instrumento coletivo aplicável",
    )[0];
    fireEvent.click(timelineCheck);
    fireEvent.click(screen.getByRole("button", { name: "Salvar neste navegador" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Premissas salvas neste navegador.",
    );
    const storedBeforeImport = localStorage.getItem(
      "transicao-escala:assumptions",
    );
    const referenceDate = screen.getByLabelText("Data de referência");
    const coverageStart = screen.getByLabelText("Início — Faixa 1");
    const coverageEnd = screen.getByLabelText("Fim — Faixa 1");
    const initialReferenceDate = (referenceDate as HTMLInputElement).value;
    const initialCoverageStart = (coverageStart as HTMLInputElement).value;
    const initialCoverageEnd = (coverageEnd as HTMLInputElement).value;
    fireEvent.change(screen.getByLabelText("Arquivo CSV da equipe"), {
      target: {
        files: [
          createCsvFile(
            [
              "salario_mensal,horas_semanais,tipo_contrato,email",
              '"2.200,50","42,75",full-time,nome-secreto@example.test',
              '"3.100,25","36,5",part-time,outra-pessoa@example.test',
            ].join("\n"),
          ),
        ],
      },
    });
    await screen.findByRole("table", { name: "Prévia da equipe" });
    expect(screen.getByLabelText("Salário mensal — Pessoa 1")).toHaveValue(
      "2.200,00",
    );
    fireEvent.click(screen.getByRole("button", { name: "Aplicar linhas válidas" }));

    expect(screen.getByLabelText("Salário mensal — Pessoa 1")).toHaveValue(
      "2200,5",
    );
    expect(screen.getByLabelText("Horas semanais — Pessoa 1")).toHaveValue(
      "42,75",
    );
    expect(screen.getByLabelText("Salário mensal — Pessoa 2")).toHaveValue(
      "3100,25",
    );
    expect(screen.getByLabelText("Horas semanais — Pessoa 2")).toHaveValue("36,5");
    expect(screen.queryByText("nome-secreto@example.test")).not.toBeInTheDocument();
    expect(referenceDate).toHaveValue(initialReferenceDate);
    expect(coverageStart).toHaveValue(initialCoverageStart);
    expect(coverageEnd).toHaveValue(initialCoverageEnd);
    expect(timelineCheck).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Salário mensal de reposição" })).toHaveValue(
      "3.100,75",
    );
    expect(screen.getByRole("textbox", { name: "Encargos do empregador (%)" })).toHaveValue(
      "35",
    );
    expect(screen.getByRole("textbox", { name: "Perda mensal de receita" })).toHaveValue(
      "123,45",
    );
    expect(screen.getByText("Diagnóstico pendente.")).toBeInTheDocument();
    expect(screen.getByText("Resultados pendentes.")).toBeInTheDocument();
    expect(screen.queryByText("Premissas salvas neste navegador.")).not.toBeInTheDocument();
    expect(localStorage.getItem("transicao-escala:assumptions")).toBe(
      storedBeforeImport,
    );

    submitDiagnostic();
    expect(
      screen.getAllByRole("radio", { name: "Não verificado", checked: true }),
    ).toHaveLength(15);
  }, 15_000);
});
