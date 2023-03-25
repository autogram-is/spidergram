import { JobStatus } from '../../index.js';
import { Duration } from 'luxon';

/**
 * Given a {JobStatus} object, print a summary of what work was perfomed,
 * how long the operation took, and whether any errors were encountered.
 */
export function summarizeStatus(
  status: JobStatus,
  listFailures = true,
): string {
  const lines: string[] = [];
  const { finished, failed, total, startTime, finishTime } = status;
  const elapsed = Duration.fromMillis(finishTime - startTime)
    .rescale()
    .toHuman();

  if (total > finished) {
    lines.push(
      `${finished.toLocaleString()} of ${total.toLocaleString()} items processed in ${elapsed}`,
    );
  } else {
    lines.push(`${finished.toLocaleString()} items processed in ${elapsed}`);
  }

  if (listFailures && failed > 0) {
    lines.push(
      `${failed.toLocaleString()} items failed; the last error was '${
        status.lastError
      }'`,
    );
  }

  return lines.join('\n');
}
