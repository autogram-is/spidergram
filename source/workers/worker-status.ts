export interface WorkerStatus {
  [key: string]: unknown;
  started: number;
  finished: number;
  total: number;
  processed: number;
  errors: Record<string, Error>;
}
