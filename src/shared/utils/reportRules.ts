/** Report sampling rules shared by the form and the simulated backend (PROVISIONAL). */

/** Approved policy: five answered calls per agent, each at least 60 seconds. */
export const APPROVED_SAMPLE = { callsPerAgent: 5, minDurationSeconds: 60 } as const;
export const CALLS_PER_AGENT_RANGE = [1, 20] as const;
export const MIN_DURATION_RANGE = [30, 600] as const;
export const MAX_REPORT_DAYS = 366;

export const differsFromApproved = (callsPerAgent: number, minDurationSeconds: number) =>
  callsPerAgent !== APPROVED_SAMPLE.callsPerAgent ||
  minDurationSeconds !== APPROVED_SAMPLE.minDurationSeconds;
