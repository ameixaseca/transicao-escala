import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("shows the product heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Monte sua escala de trabalho" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Diagnóstico e custos detalhados" }),
    ).toHaveAttribute("href", "/diagnostico");
  });
});
