import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticFormValues } from "@/features/assumptions/form-values";
import { AssumptionsForm } from "@/features/assumptions/assumptions-form";
import { fieldIdFor } from "@/components/error-summary";

const values: DiagnosticFormValues = {
  referenceDate: "2026-12-16",
  employees: [
    {
      localId: "person-1",
      salary: "2.200,50",
      weeklyHours: "42",
      contractType: "full-time",
    },
  ],
  coverage: [
    {
      rowId: "coverage-1",
      weekday: "1",
      startTime: "09:00",
      endTime: "18:00",
      minimumPeople: "1",
    },
  ],
};

afterEach(cleanup);

describe("AssumptionsForm", () => {
  it("renders labeled assumptions controls without personal identifiers", () => {
    render(
      <AssumptionsForm
        values={values}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        errors={[]}
      />,
    );

    for (const label of [
      "Data de referência",
      "Salário mensal — Pessoa 1",
      "Horas semanais — Pessoa 1",
      "Tipo de contrato — Pessoa 1",
      "Dia da semana — Faixa 1",
      "Início — Faixa 1",
      "Fim — Faixa 1",
      "Pessoas mínimas — Faixa 1",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }

    expect(screen.getByRole("group", { name: "Equipe" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Cobertura" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/nome|e-mail|cnpj/i)).not.toBeInTheDocument();
    expect(screen.getByText("Pessoa 1")).toBeInTheDocument();
  });

  it("reports employee and coverage edits to the parent", () => {
    const onChange = vi.fn();
    render(
      <AssumptionsForm
        values={values}
        onChange={onChange}
        onSubmit={vi.fn()}
        errors={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Salário mensal — Pessoa 1"), {
      target: { value: "2.500,00" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...values,
      employees: [{ ...values.employees[0], salary: "2.500,00" }],
    });

    fireEvent.change(screen.getByLabelText("Início — Faixa 1"), {
      target: { value: "08:00" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...values,
      coverage: [{ ...values.coverage[0], startTime: "08:00" }],
    });
  });

  it("reports added and removed rows while keeping one of each kind", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AssumptionsForm
        values={values}
        onChange={onChange}
        onSubmit={vi.fn()}
        errors={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adicionar pessoa" }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...values,
      employees: [
        ...values.employees,
        {
          localId: "person-2",
          salary: "",
          weeklyHours: "",
          contractType: "full-time",
        },
      ],
    });

    const twoEmployees = {
      ...values,
      employees: [
        ...values.employees,
        {
          localId: "person-2",
          salary: "",
          weeklyHours: "",
          contractType: "full-time" as const,
        },
      ],
    };
    rerender(
      <AssumptionsForm
        values={twoEmployees}
        onChange={onChange}
        onSubmit={vi.fn()}
        errors={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remover Pessoa 2" }));
    expect(onChange).toHaveBeenLastCalledWith(values);
    rerender(
      <AssumptionsForm
        values={values}
        onChange={onChange}
        onSubmit={vi.fn()}
        errors={[]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Remover Pessoa 1" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar faixa" }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...values,
      coverage: [
        ...values.coverage,
        {
          rowId: "coverage-2",
          weekday: "1",
          startTime: "09:00",
          endTime: "18:00",
          minimumPeople: "1",
        },
      ],
    });

    const twoCoverageRows = {
      ...values,
      coverage: [
        ...values.coverage,
        {
          rowId: "coverage-2",
          weekday: "1",
          startTime: "09:00",
          endTime: "18:00",
          minimumPeople: "1",
        },
      ],
    };
    rerender(
      <AssumptionsForm
        values={twoCoverageRows}
        onChange={onChange}
        onSubmit={vi.fn()}
        errors={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remover Faixa 2" }));
    expect(onChange).toHaveBeenLastCalledWith(values);
    rerender(
      <AssumptionsForm
        values={values}
        onChange={onChange}
        onSubmit={vi.fn()}
        errors={[]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Remover Faixa 1" }),
    ).toBeDisabled();
  });

  it("renders field errors beside controls with accessible relationships", () => {
    render(
      <AssumptionsForm
        values={values}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        errors={[
          { field: "referenceDate", message: "Data inválida." },
          {
            field: "coverage[0].startMinute",
            message: "Horário inicial inválido.",
          },
          {
            field: "coverage[0].endMinute",
            message: "Horário final inválido.",
          },
        ]}
      />,
    );

    for (const [label, field, message] of [
      ["Data de referência", "referenceDate", "Data inválida."],
      ["Início — Faixa 1", "coverage[0].startTime", "Horário inicial inválido."],
      ["Fim — Faixa 1", "coverage[0].endTime", "Horário final inválido."],
    ]) {
      const control = screen.getByLabelText(label);
      expect(control).toHaveAttribute("id", fieldIdFor(field));
      expect(control).toHaveAttribute("aria-invalid", "true");
      const descriptionId = control.getAttribute("aria-describedby");
      expect(descriptionId).toBeTruthy();
      expect(document.getElementById(descriptionId!)).toHaveTextContent(message);
    }
  });

  it("submits the current raw values without transforming them", () => {
    const onSubmit = vi.fn<(submittedValues: DiagnosticFormValues) => void>();
    render(
      <AssumptionsForm
        values={values}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        errors={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(values);
  });
});
