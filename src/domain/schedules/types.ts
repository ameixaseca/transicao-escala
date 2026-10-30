export type ScheduleError = { field: string; message: string };
export type OperationDay = {
  day: number;
  open: boolean;
  start: number;
  end: number;
  minimumPeople: number;
};
export type ScheduleInput = {
  referenceDate: string;
  employeeCount: number;
  weeklyMinuteLimit: number;
  days: OperationDay[];
};
export type Shift = {
  person: number;
  day: number;
  start: number;
  end: number;
  breakStart: number | null;
  breakMinutes: number;
};
export type CoverageGap = {
  day: number;
  start: number;
  end: number;
  missingPeople: number;
};
export type ScheduleIssue = {
  code: "structure" | "daily" | "weekly" | "days" | "break" |
    "inter-shift" | "weekly-rest";
  person: number;
  message: string;
};
export type ScheduleVerification = {
  issues: ScheduleIssue[];
  gaps: CoverageGap[];
  weeklyMinutesByPerson: number[];
  pendingChecks: string[];
};
export type ScheduleResult = {
  shifts: Shift[];
  verification: ScheduleVerification;
  status: "covered" | "partial" | "not-found" | "no-demand";
  searchLimited: boolean;
  additionalPeopleLowerBound: number;
};
