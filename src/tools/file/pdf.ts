import PdfParse from 'pdf-parse';
export type PdfOptions = PdfParse.DocumentInitParameters & PdfParse.Options;
import { GenericFile } from './generic-file.js';

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

  async getAll(): Promise<PdfResults> {
    const buffer = await this.load();
    const result = await PdfParse(buffer);

    return Promise.resolve({
      info: result.info ?? {},
      metadata: result.metadata ?? {},
      content: { text: result.text },
    });
  }

  async getMetadata() {
    const buffer = await this.load();
    const result = await PdfParse(buffer);

    return Promise.resolve({
      info: result.info,
      metadata: result.metadata,
    });
  }

  async getContent() {
    const buffer = await this.load();
    const result = await PdfParse(buffer);
    return Promise.resolve({ text: result.text });
  }
}
