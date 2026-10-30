import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorSummary, fieldIdFor } from "@/components/error-summary";

afterEach(cleanup);

describe("ErrorSummary", () => {
  it("links each error to the corresponding field ID", () => {
    const errors = [
      { field: "referenceDate", message: "Informe uma data válida." },
      {
        field: "coverage[0].startTime",
        message: "Informe um horário inicial válido.",
      },
    ];

    render(<ErrorSummary errors={errors} />);

    expect(
      screen.getByRole("heading", { name: "Revise os campos indicados" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    for (const error of errors) {
      expect(screen.getByRole("link", { name: error.message })).toHaveAttribute(
        "href",
        `#${fieldIdFor(error.field)}`,
      );
    }
  });
});
