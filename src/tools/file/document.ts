import { readFile } from 'fs/promises';
import mammoth from 'mammoth';
import { fromBuffer, DocumentProperties } from 'office-document-properties';

/**
 * Currently only handles importing existing .docx files, and extracting their contents
 * and metadata. In the future we may use this to generate them from scratch for reports.
 */
export class Document {
  protected fileData?: Buffer;
  protected filePath?: string;

  constructor(file?: string | Buffer) {
    if (file === undefined) {
      // Do nothing here
    } if (typeof file === 'string') {
      // Set the local filePath
      this.filePath = file;
    } else if (file instanceof Buffer) {
      // Set the local fileData
      this.fileData = file;
    }
  }

  protected async load(): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      if (this.fileData) {
        resolve(this.fileData);
      } else if (this.filePath) {
        resolve(readFile(this.filePath)
          .then(buffer => {
            this.fileData = buffer;
            return this.fileData;
          }));
      } else {
        reject(`Couldn't load ${this.filePath}`);
      }  
    });
  }

  async getContent(): Promise<{ html: string, text: string }> {
    const buffer = await this.load();
    return Promise.resolve({
      html: await mammoth.convertToHtml({ buffer }).then(results => results.value),
      text: await mammoth.extractRawText({ buffer }).then(results => results.value),
    });
  }

  async getProperties(): Promise<DocumentProperties> {
    const buffer = await this.load();
    return new Promise((resolve, reject) => fromBuffer(buffer, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    }));
  }
}