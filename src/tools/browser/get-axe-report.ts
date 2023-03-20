import AxeBuilder from '@axe-core/playwright';
import { Page } from 'playwright';
import _ from 'lodash';

export interface AxeReportOptions extends Record<string, unknown> {
  raw?: boolean;
  toolOptions?: boolean;
  passes?: boolean;
  inapplicable?: boolean;
  incomplete?: boolean;
  violations?: boolean;
}

type results = Record<string, unknown> & {
  toolOptions: unknown;
  passes?: unknown[];
  violations?: violation[];
  incomplete?: unknown[];
  inapplicable?: unknown[];
};

type violation = {
  id: string,
  impact: string,
  tags: string[],
  description: string,
  help: string,
  helpUrl: string,
  nodes: unknown[]
}

const defaults: AxeReportOptions = {
  raw: false,
  toolOptions: false,
  inapplicable: false,
  passes: false,
  incomplete: true,
  violations: true,
};

export async function getAxeReport(page: Page, options: AxeReportOptions = {}) {
  const opt: AxeReportOptions = _.defaultsDeep(options, defaults);

  // @ts-expect-error Temporary ugly Axe shim
  const results: results = await new AxeBuilder.default({ page }).analyze();

  if (opt.toolOptions === false) delete results.toolOptions;
  if (opt.inapplicable === false) delete results.inapplicable;
  if (opt.passes === false) delete results.passes;
  if (opt.incomplete === false) delete results.incomplete;
  if (opt.violations === false) delete results.violations;

  return results;
}


type formattedResult = Record<string, number | undefined>;

export function formatAxeReport(input: results): formattedResult {
  const output: formattedResult = {};

  output.needsReview = input.incomplete?.length ?? 0,
  output.totalViolations = 0;

  for (const v of input.violations ?? []) {
    output[v.impact] = (output[v.impact] ?? 0) + 1;
    output.totalViolations++;
  }

  return output;
}