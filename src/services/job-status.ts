export interface JobStatus extends Record<string, unknown> {
  total: number;
  complete: number;
  errors: number;
  lastError?: Error;
  startTime: number;
  finishTime: number;
}