import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataControls } from "@/features/local-data/data-controls";

describe("data controls", () => {
  it("disables saving invalid assumptions and invokes save when valid", () => {
    const onSave = vi.fn();
    const props = {
      hasSavedData: false,
      savedAt: null,
      statusMessage: null,
      storageError: null,
      storageNotice: null,
      onSave,
      onDelete: vi.fn(),
    };
    const { rerender } = render(
      <DataControls
        canSave={false}
        {...props}
      />,
    );

    const saveButton = screen.getByRole("button", {
      name: "Salvar neste navegador",
    });
    expect(saveButton).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();

    rerender(<DataControls canSave {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar neste navegador" }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("announces successful saves and storage errors accessibly", () => {
    const { rerender } = render(
      <DataControls
        canSave
        hasSavedData
        savedAt="2026-10-29T12:00:00.000Z"
        statusMessage="Premissas salvas neste navegador."
        storageError={null}
        storageNotice={null}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Premissas salvas neste navegador.",
    );
    expect(screen.getByText(/2026/)).toBeInTheDocument();

    rerender(
      <DataControls
        canSave
        hasSavedData
        savedAt={null}
        statusMessage={null}
        storageError="O armazenamento local não está disponível neste navegador."
        storageNotice={null}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "O armazenamento local não está disponível neste navegador.",
    );
  });
});
