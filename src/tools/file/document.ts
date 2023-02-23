import mammoth from 'mammoth';
import { fromBuffer, DocumentProperties } from 'office-document-properties';
import { GenericFile } from './generic-file.js';

/**
 * Currently only handles importing existing .docx files, and extracting their contents
 * and metadata. In the future we may use this to generate them from scratch for reports.
 */
export class Document extends GenericFile {
  async getAll(): Promise<{html?: string, text?: string, properties?: DocumentProperties}> {
    const buffer = await this.load();

    return Promise.resolve({
      html: await mammoth.convertToHtml({ buffer }).then(results => results.value),
      text: await mammoth.extractRawText({ buffer }).then(results => results.value),
      properties: await this.getData()
    });
  }

  async getContent(): Promise<{ html?: string, text?: string }> {
    const buffer = await this.load();
    return Promise.resolve({
      html: await mammoth.convertToHtml({ buffer }).then(results => results.value),
      text: await mammoth.extractRawText({ buffer }).then(results => results.value),
    });
  }

  async getData(): Promise<DocumentProperties> {
    const buffer = await this.load();
    return new Promise((resolve, reject) => fromBuffer(buffer, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    }));
  }
}