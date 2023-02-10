import PdfParse from 'pdf-parse';
export type PdfOptions = PdfParse.DocumentInitParameters & PdfParse.Options;
import { Result } from 'pdf-parse';

export async function getPdfData(input: string | URL | Buffer | PdfOptions) {
  let data: Result | undefined = undefined;
  if (typeof input === 'string' || input instanceof URL || Buffer.isBuffer(input)) {
    data = await PdfParse(input);
  } else {
    const  { render, max, version, ...initParams } = input;
    data = await PdfParse(initParams, { render, max, version });
  }

  // TODO: Transform work on the PdfTools.result object. We want it to
  // resemble the PageData and PageContent structures returned by HtmlTools.
  return Promise.resolve(data);
}
