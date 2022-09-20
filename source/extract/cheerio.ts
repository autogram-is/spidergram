import * as cheerio from 'cheerio';

export type CheerioOptions = cheerio.CheerioParserOptions;

const defaults: CheerioOptions = {
  decodeEntities: true,
  lowerCaseTags: true,
  lowerCaseAttributeNames: true,
  recognizeCDATA: true,
  recognizeSelfClosing: true,
  normalizeWhitespace: true,
  ignoreWhitespace: true,
};

export class CheerioParser {
  readonly root: cheerio.Root;

  constructor(body: string, customOptions: CheerioOptions = {}) {
    const options = {
      ...defaults,
      ...customOptions,
    };
    this.root = cheerio.load(body, options);
  }
}
