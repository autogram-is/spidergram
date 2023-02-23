import PdfParse from 'pdf-parse';
export type PdfOptions = PdfParse.DocumentInitParameters & PdfParse.Options;
import { GenericFile } from './generic-file.js';

export class Pdf extends GenericFile {

  async getAll() {
    const buffer = await this.load();
    const result = await PdfParse(buffer);
  
    return Promise.resolve({
      info: result.info,
      metadata: result.metadata,
      text: result.text
    });
  }

  async getData() {
    const buffer = await this.load();
    const result = await PdfParse(buffer);
  
    return Promise.resolve({
      info: result.info,
      metadata: result.metadata
    });
  }

  async getContent() {
    const buffer = await this.load();
    const result = await PdfParse(buffer);
    return Promise.resolve(result.text);
  }
}
