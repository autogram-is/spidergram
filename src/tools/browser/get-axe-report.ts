import AxeBuilder from '@axe-core/playwright';
import { Page } from 'playwright';
import _ from 'lodash';

export interface AxeReportOptions extends Record<string, unknown> {
  toolOptions?: boolean;
  passes?: boolean;
  inapplicable?: boolean;
  incomplete?: boolean;
  violations?: boolean;
}

type results = Record<string, unknown> & {
  toolOptions: unknown;
  passes?: unknown[];
  violations?: unknown[];
  incomplete?: unknown[];
  inapplicable?: unknown[];
};

const defaults: AxeReportOptions = {
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
