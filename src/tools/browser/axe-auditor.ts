import AxeBuilder from '@axe-core/playwright';
import { Page } from 'playwright';
import is from '@sindresorhus/is';
import { KeyValueStore, Resource, SpidergramError } from '../../index.js';

// These types are yoinked from the Axe-Core project; their Typescript/ESM situation
// is a little chaotic at the moemnt, and we want to revisit these duplicated types
// whenever a new version is released to be sure we still need them.

interface RuleObject {
  [key: string]: {
    enabled: boolean;
  };
}

interface RunOptions {
  runOnly?: string[] | string;
  rules?: RuleObject[];
  reporter?: string;
  resultTypes?: string[];
  selectors?: boolean;
  ancestry?: boolean;
  xpath?: boolean;
  absolutePaths?: boolean;
  iframes?: boolean;
  elementRef?: boolean;
  frameWaitTime?: number;
  preload?: boolean;
  performanceTimer?: boolean;
  pingWaitTime?: number;
}

interface AxeReport {
  toolOptions: RunOptions;
  passes: Result[];
  violations: Result[];
  incomplete: Result[];
  inapplicable: Result[];
  timestamp: string;
  error?: Error | true;
}

interface Result {
  description: string;
  help: string;
  helpUrl: string;
  id: string;
  impact?: string;
  tags: string[];
  nodes: NodeResult[];
}

interface NodeResult {
  html: string;
  impact?: string;
  target: string[];
  xpath?: string[];
  ancestry?: string[];
  any: CheckResult[];
  all: CheckResult[];
  none: CheckResult[];
  failureSummary?: string;
  element?: HTMLElement;
}

interface CheckResult {
  id: string;
  impact: string;
  message: string;
  data: unknown;
  relatedNodes?: RelatedNode[];
}

interface RelatedNode {
  target: string[];
  html: string;
}

export type AxeAuditOptions = {
  summary?:
    | 'full'
    | 'category'
    | 'impact'
    | 'omit'
    | ((audit: AxeReport) => unknown);
  save?: string | boolean;
};

const defaults: AxeAuditOptions = {
  summary: 'impact',
  save: false,
};

/**
 * This is bare bones for now, but
 */
export class AxeAuditor {
  static async run(page: Page) {
    // @ts-expect-error Temporary ugly Axe shim
    const ab = new AxeBuilder.default({ page }) as AxeBuilder;

    // In the future we may want to set additional options before running the analysis.
    return ab.analyze().catch(error => {
      return {
        toolOptions: {},
        passes: [],
        violations: [],
        incomplete: [],
        inapplicable: [],
        timestamp: new Date(Date.now()).toISOString(),
        error: error instanceof Error ? error : true,
      };
    }) as Promise<AxeReport>;
  }

  static async getAuditResults(
    page: Page,
    options: true | AxeAuditOptions = true,
  ) {
    const opt: AxeAuditOptions = {
      ...defaults,
      ...(options === true ? {} : options),
    };

    if (page.isClosed()) {
      return Promise.resolve({
        error: new SpidergramError('Page was closed before action'),
      });
    }

    const kv = await KeyValueStore.open(
      typeof opt.save === 'string' ? opt.save : 'axe_audits',
    );

    return AxeAuditor.run(page)
      .then(results => {
        if (opt.save) {
          const key =
            typeof opt.save === 'string'
              ? opt.save
              : Resource.getKeyForUrl(page.url());
          return kv.setValue(key, results).then(() => results);
        } else {
          return results;
        }
      })
      .then(results => {
        if (results.error || opt.summary === 'full') {
          return results;
        } else if (opt.summary === 'category') {
          return AxeAuditor.totalByCategory(results);
        } else if (opt.summary === 'impact') {
          return AxeAuditor.totalByImpact(results);
        } else if (is.function_(opt.summary)) {
          return opt.summary(results);
        } else {
          // This includes summary === 'omit'
          return undefined;
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error) return { error };
        else return { error: true };
      });
  }

  static totalByCategory(input: AxeReport) {
    return AxeAuditor.totalByImpact(input);
  }

  static totalByImpact(input: AxeReport) {
    const output: Record<string, string | number | undefined> = {
      needsReview: input.incomplete?.length ?? 0,
      totalViolations: 0,
      timestamp: input.timestamp
        ? new Date(input.timestamp).toISOString()
        : undefined,
    };

    for (const v of input.violations ?? []) {
      if (v.impact) {
        output[v.impact] ??= 0;
        if (typeof output[v.impact] === 'number') {
          (output[v.impact] as number)++;
        }
      }
      (output.totalViolations as number)++;
    }

    return output;
  }
}
