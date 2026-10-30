import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScheduleForm } from "@/features/schedules/schedule-form";
import { createScheduleFormValues } from "@/features/schedules/form-values";

afterEach(cleanup);

describe("compact schedule form", () => {
  it("starts without asking for salaries or individual employee records", () => {
    render(<ScheduleForm values={createScheduleFormValues()} errors={[]} busy={false}
      onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Quantos funcionários você tem hoje?")).toHaveValue(null);
    expect(screen.queryByLabelText(/Salário/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar escala" })).toBeEnabled();
    expect(screen.getByLabelText("Abertura — Domingo")).toBeDisabled();
  });
  it("copies only to explicitly selected days", () => {
    const values = createScheduleFormValues();
    values.days[0].start = "08:17";
    const onChange = vi.fn();
    render(<ScheduleForm values={values} errors={[]} busy={false}
      onChange={onChange} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Copiar para Terça-feira"));
    fireEvent.click(screen.getByRole("button", { name: "Copiar para os dias selecionados" }));
    const next = onChange.mock.calls[0][0];
    expect(next.days[1].start).toBe("08:17");
    expect(next.days[2].start).toBe("09:00");
  });
  it("associates field errors and keeps a focusable summary", () => {
    render(<ScheduleForm values={createScheduleFormValues()}
      errors={[{ field: "employeeCount", message: "Informe a equipe." }]} busy={false}
      onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Quantos funcionários você tem hoje?"))
      .toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("link", { name: "Informe a equipe." }))
      .toHaveAttribute("href", "#field-employeeCount");
  });
});
