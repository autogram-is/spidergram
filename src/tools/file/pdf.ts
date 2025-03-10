import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFPageProxy, PDFDocumentProxy } from 'pdfjs-dist';
import { GenericFile, GenericFileData } from './generic-file.js';
import { TextTools } from '../index.js';
import _ from 'lodash';

export class Pdf extends GenericFile {
  // Application/pdf is the "correct" one but some legacy applications
  // that predate RFC 3778 still use x-pdf. Viva la internet.
  public static mimeTypes = ['application/pdf', 'application/x-pdf'];
  public static extensions = ['pdf'];

  async getAll(): Promise<GenericFileData> {
    return this.getBuffer()
      .then(buffer =>
        getDocument({
          data: Uint8Array.from(buffer),
          verbosity: VerbosityLevel.ERRORS,
          disableFontFace: true,
        }),
      )
      .then(loader => loader.promise)
      .then(pdf => this.formatPdfDocument(pdf));
  }

  async getMetadata() {
    return this.getAll().then(results => results.metadata);
  }

  async getContent() {
    return this.getAll().then(results => results.content);
  }

  protected async formatPdfDocument(
    pdf: PDFDocumentProxy,
    pageDelimiter = '\n',
  ): Promise<GenericFileData> {
    const data = await pdf.getMetadata();
    const fields = await pdf.getFieldObjects();
    const formattedMetadata: Record<string, unknown> = {};

    if (data.metadata) {
      for (const [key, value] of Object.entries(data.metadata.getAll())) {
        if (key.includes(':')) {
          _.set(formattedMetadata ?? {}, key.split(':'), value);
        }
      }
    }

    const lines: Promise<string>[] = [];
    const foundUrls: Promise<string[]>[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      lines.push(this.renderPage(page));
      foundUrls.push(this.getPageLinks(page));
    }
    const text = await Promise.all(lines).then(strings =>
      strings.join(pageDelimiter),
    );
    const urls = await Promise.all(foundUrls).then(_.flatten);

    return Promise.resolve({
      metadata: {
        pages: pdf.numPages,
        formFields: fields?.length ?? undefined,
        info: data.info,
        ...formattedMetadata,
      },
      content: {
        text,
        urls: urls.length > 0 ? urls : undefined,
        readability: TextTools.getReadabilityScore(text),
      },
    });
  }

  /**
   * Returns an array of URLs. This only catches URLs that are explicitly
   * clickable in the PDF itself — not url-like text in the PDF's body text.
   */
  protected async getPageLinks(page: PDFPageProxy) {
    const results = new Set<string>();

    // First we look for clickable link annotations, the most reliable method of
    // locating URLs in the document.
    const annotations = await page.getAnnotations({ intent: 'display' });

    for (const a of annotations) {
      if (a?.subtype === 'Link' && !!a.url) {
        results.add(a.url);
      }
    }

    // We may want to use Crawlee's getSocialLinks function, or a general url regex,
    // to hunt for URLs that aren't explicitly clickable.

    return Promise.resolve([...results]);
  }

  protected async renderPage(page: PDFPageProxy): Promise<string> {
    const text: string[] = [];
    const content = await page.getTextContent();

    // It may be useful to us Y-offset to detect newlines.
    // https://github.com/mozilla/pdf.js/issues/8963
    for (const i of content.items) {
      if ('str' in i && i.str.length > 0) {
        text.push(i.str);
      }
    }

    const output = text
      .join(' ')
      .replaceAll(/\s+/g, ' ')
      .replaceAll(/\n+/g, '\n')
      .trim();

    page.cleanup();
    return Promise.resolve(output);
  }
}
