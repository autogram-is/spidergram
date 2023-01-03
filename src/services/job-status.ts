export interface JobStatus extends Record<string, unknown> {
  total: number;
  finished: number;
  failed: number;
  lastError?: string;
  startTime: number;
  finishTime: number;
}
