import PdfParse from 'pdf-parse';
import { Result as PdfResult } from 'pdf-parse';
export type PdfOptions = PdfParse.DocumentInitParameters & PdfParse.Options;
import { GenericFile, GenericFileData } from './generic-file.js';
import _ from 'lodash';

export class Pdf extends GenericFile {
  // Application/pdf is the "correct" one but some legacy applications
  // that predate RFC 3778 still use x-pdf. Viva la internet.
  public static mimeTypes = ['application/pdf', 'application/x-pdf'];
  public static extensions = ['pdf'];

  async getAll(): Promise<GenericFileData> {
    return this.getBuffer()
      .then(buffer => PdfParse(buffer))
      .then(result => {
        return {
          content: { text: result.text.trim() },
          metadata: this.formatMetadata(result)
        };
      });
  }

  async getMetadata() {
    return this.getAll().then(results => results.metadata );
  }

  async getContent() {
    return this.getAll().then(results => results.content );
  }

  // PDFJS spits things out in some very strange formats.
  // Down the line we want to make it better, but for now
  // we'll just try to move things around as best we can.
  protected formatMetadata(input: PdfResult) {
    const output: Record<string, unknown> = {
      pages: input.numpages,
      ...input.info ?? undefined,
      ...input.metadata ?? undefined
    }

    for (const [key, value] of Object.entries(output._metadata ?? {})) {
      if (key.includes(':')) {
        _.set(output ?? {}, key.split(':'), value)
      }
      delete output._metadata;
    }

    return output;
  }
}
