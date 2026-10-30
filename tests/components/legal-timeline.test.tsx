import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getStageDates } from "@/domain/dates/stages";
import {
  PROVISIONAL_LEGAL_PARAMETERS,
  type LegalParameters,
} from "@/domain/legal/legal-parameters";
import { LegalTimeline } from "@/features/timeline/legal-timeline";
import type {
  ChecklistItemId,
  LegalStageId,
} from "@/features/timeline/legal-timeline";

afterEach(cleanup);

const checklistItemIds: ChecklistItemId[] = [
  "collective-agreement",
  "rests-and-breaks",
  "sector-sundays-holidays",
  "salary-and-divisor",
  "special-regimes",
];

const emptyChecklist = () =>
  ({
    phase1: Object.fromEntries(checklistItemIds.map((id) => [id, false])),
    phase2: Object.fromEntries(checklistItemIds.map((id) => [id, false])),
  }) as Record<LegalStageId, Record<ChecklistItemId, boolean>>;

describe("LegalTimeline", () => {
  it("renders milestone dates calculated by getStageDates and their transition weeks", () => {
    const stageDates = getStageDates(PROVISIONAL_LEGAL_PARAMETERS);
    expect(stageDates.ok).toBe(true);
    if (!stageDates.ok) throw new Error("Expected provisional stage dates.");

    render(
      <LegalTimeline
        parameters={PROVISIONAL_LEGAL_PARAMETERS}
        checkedItems={emptyChecklist()}
        onChecklistChange={vi.fn()}
      />,
    );

    const stage1 = screen.getByRole("region", { name: "Etapa 1" });
    const stage2 = screen.getByRole("region", { name: "Etapa 2" });
    expect(within(stage1).getByText("16/12/2026")).toBeInTheDocument();
    expect(within(stage1).getByText("14/12/2026 a 20/12/2026")).toBeInTheDocument();
    expect(within(stage2).getByText("16/12/2027")).toBeInTheDocument();
    expect(within(stage2).getByText("13/12/2027 a 19/12/2027")).toBeInTheDocument();
    expect(stageDates.value.phase1).toBe("2026-12-16");
    expect(stageDates.value.phase2).toBe("2027-12-16");
  });

  it("shows provisional status, legal-position caveat, GJ-04 blocker, and transition notice", () => {
    render(
      <LegalTimeline
        parameters={PROVISIONAL_LEGAL_PARAMETERS}
        checkedItems={emptyChecklist()}
        onChecklistChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Parâmetros legais provisórios/)).toBeInTheDocument();
    expect(screen.getByText(/ec-141-provisional/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /posições jurídicas apresentadas se baseiam nas respostas reportadas/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("GJ-04 permanece como bloqueador de lançamento."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Nesta semana passa a valer a nova jornada. Confira se a escala observa a regra nova.",
      ),
    ).toHaveLength(2);
  });

  it("renders five unchecked operational items for each milestone", () => {
    render(
      <LegalTimeline
        parameters={PROVISIONAL_LEGAL_PARAMETERS}
        checkedItems={emptyChecklist()}
        onChecklistChange={vi.fn()}
      />,
    );

    for (const stage of ["Etapa 1", "Etapa 2"]) {
      const region = screen.getByRole("region", { name: stage });
      expect(within(region).getAllByRole("checkbox")).toHaveLength(5);
      within(region)
        .getAllByRole("checkbox")
        .forEach((checkbox) => expect(checkbox).not.toBeChecked());
    }
  });

  it("emits stage-and-item changes while keeping other checklist entries independent", () => {
    function ControlledTimeline() {
      const [checkedItems, setCheckedItems] = useState(emptyChecklist());
      const handleChange = (
        stage: LegalStageId,
        item: ChecklistItemId,
        checked: boolean,
      ) => {
        setCheckedItems((current) => ({
          ...current,
          [stage]: { ...current[stage], [item]: checked },
        }));
      };

      return (
        <LegalTimeline
          parameters={PROVISIONAL_LEGAL_PARAMETERS}
          checkedItems={checkedItems}
          onChecklistChange={handleChange}
        />
      );
    }

    render(<ControlledTimeline />);

    const stage1 = screen.getByRole("region", { name: "Etapa 1" });
    const firstItem = within(stage1).getAllByRole("checkbox")[0];
    fireEvent.click(firstItem);

    expect(firstItem).toBeChecked();
    expect(within(stage1).getAllByRole("checkbox")[1]).not.toBeChecked();
    expect(
      within(screen.getByRole("region", { name: "Etapa 2" })).getAllByRole(
        "checkbox",
      )[0],
    ).not.toBeChecked();
  });

  it("shows the publication date error without inventing milestone dates", () => {
    render(
      <LegalTimeline
        parameters={
          {
            ...PROVISIONAL_LEGAL_PARAMETERS,
            publicationDate: null,
          } satisfies LegalParameters
        }
        checkedItems={emptyChecklist()}
        onChecklistChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/publication-date-required/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Etapa 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Etapa 2" })).not.toBeInTheDocument();
  });
});
