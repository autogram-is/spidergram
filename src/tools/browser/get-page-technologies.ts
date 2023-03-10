import { Spidergram, Resource, BrowserTools as bt } from "../../index.js";
import is from '@sindresorhus/is';
import _ from "lodash";

export { FingerprintResult as PageTech } from "./fingerprint.js";

export type PageTechnologyExtractor = (
  input: string | cheerio.Root | Resource | Response,
  options: PageTechnologyOptions,
) => Promise<bt.FingerprintResult[]>;

export interface PageTechnologyOptions extends bt.FingerprintOptions {
  input?: bt.FingerprintInput,
}

/**
 * Extract the core content of an HTML page and return its plaintext, with
 * optional configuration options.
 */
export async function getPageTechnologies(
  input: string | cheerio.Root | Resource | Response,
  customOptions: PageTechnologyOptions = {},
) {
  const options: PageTechnologyOptions = _.defaultsDeep(customOptions, Spidergram.config.pageTech)
  if (is.function_(Spidergram.config.getPageTechnologies)) {
    return Spidergram.config.getPageTechnologies(input, options);
  } else {
    return _getPageTechnologies(input, options);
  }
}

async function _getPageTechnologies(
  input: string | cheerio.Root | Resource | Response, 
  options: PageTechnologyOptions = {}
) { 
  const fp = new bt.Fingerprint();
  await fp.loadDefinitions(options);
  const customSignals = options.input ?? {};

  // We do different work to get fingerprint data
  if (input instanceof Resource) {
    // An instantiated resource object
    return await fp.extractResourceInput(input)
      .then(signals => fp.analyze(signals))

  } else if (typeof input === 'string') {
    // A raw HTML string
    return await fp.extractBodyData(input)
      .then(signals => fp.analyze({ ...signals, ...customSignals }));

  } else if (is.function_(input)) {
    // A Cheerio root selector
    return await fp.extractBodyData(input.html())
      .then(signals => fp.analyze({ ...signals, ...customSignals }));

  } else {
    // A Fetch Response
    return await fp.extractResponseInput(input)
      .then(signals => fp.analyze({ ...signals, ...customSignals }));
  }
}
