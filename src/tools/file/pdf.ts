import PdfParse from 'pdf-parse';
export type PdfOptions = PdfParse.DocumentInitParameters & PdfParse.Options;
import { GenericFile } from './generic-file.js';
import _ from 'lodash';

type PdfResults = {
  info: Record<string, unknown>;
  metadata: Record<string, unknown>;
  content: {
    text: string;
  };
};

export class Pdf extends GenericFile {
  // Application/pdf is the "correct" one but some legacy applications
  // that predate RFC 3778 still use x-pdf. Viva la internet.
  public static mimeTypes = ['application/pdf', 'application/x-pdf'];
  public static extensions = ['pdf'];

  async getAll(): Promise<PdfResults> {
    return this.getBuffer()
      .then(buffer => PdfParse(buffer))
      .then(result => {
        return {
          info: result.info ?? {},
          metadata: result.metadata ?? {},
          content: { text: result.text },
        }
      })
  }

  async getMetadata() {
    return this.getBuffer()
      .then(buffer => PdfParse(buffer))
      .then(result => {
        const tree: Record<string, unknown> = { pages: result.numpages };
        for (const [key, value] of Object.entries(result.metadata)) {
          _.set(tree, key.split(':'), value)
        }
        return tree;
      });
  }

  async getContent() {
    return this.getBuffer()
      .then(buffer => PdfParse(buffer))
      .then(result => {
        return { text: result.text }
      });
  }
}
