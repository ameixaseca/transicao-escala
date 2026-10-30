import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScheduleResultView } from "@/features/schedules/schedule-result";
import type { ScheduleResult } from "@/domain/schedules/types";

afterEach(cleanup);
const result: ScheduleResult = {
  status: "partial", shifts: [], searchLimited: true, additionalPeopleLowerBound: 1,
  verification: {
    weeklyMinutesByPerson: [0], issues: [],
    gaps: [{ day: 0, start: 497, end: 1063, missingPeople: 1 }],
    pendingChecks: ["Descansos externos não verificados."],
  },
};

describe("weekly schedule output", () => {
  it("exposes gaps and the limits of hiring estimates and search", () => {
    render(<ScheduleResultView result={result} stale={false} />);
    expect(screen.getByText("Ainda há horários sem cobertura.")).toBeInTheDocument();
    expect(screen.getByText(/08:17–17:43/)).toBeInTheDocument();
    expect(screen.getByText(/não comprova que a escala seja impossível/)).toBeInTheDocument();
    expect(screen.getByText(/A quantidade suficiente depende/)).toBeInTheDocument();
  });
  it("does not display successful coverage for stale data", () => {
    render(<ScheduleResultView result={{ ...result, status: "covered" }} stale />);
    expect(screen.queryByText(/Cobertura atendida/)).not.toBeInTheDocument();
    expect(screen.getByText(/Resultado anterior/)).toBeInTheDocument();
  });
  it("explains no-demand without claiming operational success", () => {
    render(<ScheduleResultView result={{
      ...result, status: "no-demand", searchLimited: false,
      additionalPeopleLowerBound: 0, verification: { ...result.verification, gaps: [] },
    }} stale={false} />);
    expect(screen.getByText("Nenhum dia de funcionamento foi informado.")).toBeInTheDocument();
  });
});
