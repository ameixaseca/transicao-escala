import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DiagnosticPage from "@/app/diagnostico/page";

afterEach(cleanup);

const openDiagnostic = () => {
  render(<DiagnosticPage />);
};

const submitDiagnostic = () => {
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
};

const submitScenarios = () => {
  fireEvent.click(screen.getByRole("button", { name: "Calcular cenários" }));
};

describe("diagnostic dashboard", () => {
  it("starts in Premissas and exposes all four sections", () => {
    openDiagnostic();

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
  });

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
  });

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
  });

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
});
