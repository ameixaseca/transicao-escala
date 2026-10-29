import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("shows the product heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Copiloto de Transição 6x1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Começar diagnóstico" }),
    ).toHaveAttribute("href", "/diagnostico");
  });
});
