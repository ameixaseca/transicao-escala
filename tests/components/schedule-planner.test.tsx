import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SchedulePlanner } from "@/features/schedules/schedule-planner";

afterEach(cleanup);

describe("simplified weekly planner", () => {
  it("generates without salaries and invalidates a changed result", async () => {
    render(<SchedulePlanner />);
    fireEvent.change(screen.getByLabelText("Quantos funcionários você tem hoje?"),
      { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
    const result = await screen.findByRole("region", { name: "Sua escala semanal" });
    expect(within(result).getByText(/Cobertura atendida/)).toBeInTheDocument();
    expect(within(result).getByText(/semanas anteriores e seguintes/)).toBeInTheDocument();
    expect(within(result).getAllByText(/Intervalo/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Quantos funcionários você tem hoje?"),
      { target: { value: "3" } });
    expect(screen.getByRole("status"))
      .toHaveTextContent("Dados alterados. Gere a escala novamente.");
    expect(screen.queryByText(/Cobertura atendida/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Diagnóstico e custos detalhados" }))
      .toHaveAttribute("href", "/diagnostico");
  });
  it("reports invalid inputs before generating and focuses the field", () => {
    render(<SchedulePlanner />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantos funcionários você tem hoje?")).toHaveFocus();
    expect(screen.queryByRole("region", { name: "Sua escala semanal" })).toBeNull();
  });
  it("preserves saved detailed assumptions", async () => {
    const saved = '{"example":"untouched"}';
    localStorage.setItem("transicao-escala:assumptions", saved);
    render(<SchedulePlanner />);
    fireEvent.change(screen.getByLabelText("Quantos funcionários você tem hoje?"),
      { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
    await screen.findByRole("region", { name: "Sua escala semanal" });
    expect(localStorage.getItem("transicao-escala:assumptions")).toBe(saved);
    localStorage.clear();
  });
});
